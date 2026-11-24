<script lang="ts">
  import { istFehlend, fehlendMenge, fehlendSchluessel, type Fehlmenge, fehlendMitWert, fehlendSyntax } from '../lib/fehlend';
  import { zitWert, pk } from '../lib/befehlstext';
  import { rutsch } from '../lib/rutsch';
  import { sage, endeJuengstAngesagt } from '../lib/ansage';
  import { ergebnisAnsage, KARTENSUCHE_RUHE_MS } from '../lib/ansage-ergebnis.svelte';
  import { itemKarte, itemZeilenkoepfe, itemNamen } from '../lib/itemnamen';
  import { kleinste, groesste } from '../lib/menge';
  import { tick, untrack, onDestroy, setContext } from 'svelte';
  import { schliessen } from '../lib/blattentfernen.svelte';
  import { einmal } from '../lib/einmal';
  import { qualitaetKarten } from '../lib/qualitaet';
  import { s, d, L, Lp, einstSpeichern, rechne, aendere, rueckgaengig, melde, meldeFehler, sichern, abbruchStand, textAbgebrochen, spalteNach, nutzbareSets, nutzbareSkalen, setzeSkalen, type Blatt, type KursZiel } from '../lib/sitzung.svelte';
  import { skalaMitFragen, skalaNameFehler } from '../lib/skalen';
  import { mehrfachRechnen, optionsNamenAus, setAlsSpalte, istSetName, type Mehrfach } from '../lib/mehrfach';
  import Kursiv from '../bausteine/Kursiv.svelte';
  import { kopiereKursiv } from '../lib/kursiv';
  import { codeSpaltenHinweis } from '../lib/codespalten';
  import { mehrfachHinweise, basisFrage, basisFrageText } from '../lib/mehrfachsaetze';
  import Mehrfachdiagramm from '../bausteine/Mehrfachdiagramm.svelte';
  import { regFaktor, regTerme, regVariablen, zuVieleStufen, ordinalAlsZahl, type RegFaktor } from '../lib/regfaktor';
  import { anova2, anova2Lauf, kovarianz, kovarianzMehr, kovarianzBefehl, type Anova2Daten, type AncovaDaten, type AncovaMehrDaten, type Kodierung } from '../lib/anova2';
  import type { Anova2E, AncovaE } from '../lib/anova2saetze';
  import Interaktionsdiagramm from '../bausteine/Interaktionsdiagramm.svelte';
  import { VERFAHREN, kennung, alleJaNein, faAusErgebnis, type FaWahl, logistikKodierung, empfohleneKorrelation, empfohleneKorrelationListe, korrelationsGrundText, matrixGrundText, korrWarum, rocBefehl, uebereinstimmungsArt, uebereinstimmungWarum, kappaZuVieleStufen, KAPPA_STUFEN_MAX, type Ctx, type Luecke, type Verfahren, type Werte } from '../lib/verfahren';
  import { lesbar, type Spalte } from '../lib/verzeichnis';
  import { fundSchluessel } from '../lib/datencheck';
  import { zweiGruppen, anova, type Anova, praePost, type PraePost, kappa, kappaMit, gewichtName, iccErgebnis, type Kappa, type IccErgebnis, logistik, type Logistik, zusammenhang, zusammenhangMit, zusammenhangPartial, korrName, vorhersage, skala, faktoren, faktorTabellenBereinigen, faktorLadungenAusblenden, kreuz, verteilung, verteilungNurSets, aufzaehlung, konstant, type ZweiGruppen, type Zusammenhang, type Vorhersage, type Skala, type Faktoren, type Kreuz, type Verteilung } from '../lib/ergebnis';
  import { werteVon, zeitreiheSpalten } from '../lib/blatttitel';
  import { standVon, fehlendeSpalten, ergebnisFaelltWeg } from '../lib/blattstand';
  import { saetzeZu, berichtTabellenVorschlag, tabellenSchluessel, excelTabellen, ersteJe, rangVon, wertName } from '../lib/berichtsatz';
  import { zahlDe } from '../lib/format';
  import { dez, ki, zitat, dp, pfeil, richtung } from '../i18n/profil';
  import { exportiereErgebnisseExcel, exportiereBerichtWord, veraltetMarke, herunterladen, heute } from '../lib/export';
  import { baueRSkript, rGewichtFelder, rSkriptMoeglich, rSkriptZip, type RErgebnis, type RKontext } from '../lib/rskript';
  import ExportMenue, { type ExportEintrag } from '../bausteine/ExportMenue.svelte';
  import { merkeSyntax } from '../lib/befehlsspeicher.svelte';
  import Icon from '../bausteine/Icon.svelte';
  import Rechnet from '../bausteine/Rechnet.svelte';
  import Abbrechen from '../bausteine/Abbrechen.svelte';
  import { EngineAbgebrochen } from '../engine/wasm-engine';
  import { hereingleiten } from '../lib/wechsel';
  import HilfeLink from '../bausteine/HilfeLink.svelte';
  import SatzMitListen from '../bausteine/SatzMitListen.svelte';
  import WeiterMitListe from '../bausteine/WeiterMitListe.svelte';
  import { weich } from '../lib/weich';
  import { spaltenGruppen, gruppenSpanne, namensStamm } from '../lib/spaltengruppen';
  import Rand, { type RandKontext } from '../bausteine/Rand.svelte';
  import Ausgabe from '../bausteine/Ausgabe.svelte';
  import Gruppendiagramm from '../bausteine/Gruppendiagramm.svelte';
  import BalkenBlock from '../bausteine/BalkenBlock.svelte';   // Später S-F2 (E): Mittelwert nach Gruppe als Bild, 2 bis 12 Gruppen
  import Streudiagramm from '../bausteine/Streudiagramm.svelte';
  import StreuErweitert from '../bausteine/StreuErweitert.svelte';
  import Streumatrix from '../bausteine/Streumatrix.svelte';
  import FehlerbalkenWiederholt from '../bausteine/FehlerbalkenWiederholt.svelte';
  import { regressionZuLauf } from '../lib/regstreu';
  import SpaghettiBlock from '../bausteine/SpaghettiBlock.svelte';
  import Praepostdiagramm from '../bausteine/Praepostdiagramm.svelte';
  import Kappatabelle from '../bausteine/Kappatabelle.svelte';
  import { interRechnen, alphaSkala, skalaName, zaehleEinheiten, tabellenInter, type Inter } from '../lib/intercodersaetze';
  import Iccdiagramm from '../bausteine/Iccdiagramm.svelte';
  import Blandaltmandiagramm from '../bausteine/Blandaltmandiagramm.svelte';
  import BlattMethodenvergleich from '../bausteine/BlattMethodenvergleich.svelte';
  import { aucAus, rocKurve, type Auc } from '../lib/roc';
  import Rocdiagramm from '../bausteine/Rocdiagramm.svelte';
  import { mitNormalitaet, mitGetrimmtem, zahlenZeilenMitLuecken } from '../lib/diagrammquellen';
  import { partialPunkte, partialMindestPersonen } from '../lib/partialkorrelation';
  import { komma, ohneNull, pWert, wilcoxonGrundText, kreuzZellenSyntax } from '../lib/ergebnis';
  import { baPunkte } from '../lib/blandaltman';
  import { standardWahl, positivVorschlag, type DiagnoseWahl } from '../lib/diagnostik';
  import { risikoVon, risikoVorschlag, nntText, type RisikoWahl } from '../lib/risikosaetze';
  import { saetzeTypicalError, tabellenTypicalError } from '../lib/typicalerrorsaetze';
  import { tabelleBlandAltman } from '../lib/guetetabellen';
  import Zeitdiagramm from '../bausteine/Zeitdiagramm.svelte';
  import { messwiederholung, mindestPersonen, korrigiert, type Messwiederholung, type MwKorrektur } from '../lib/messwiederholung';
  import { mwNamen } from '../lib/mwsaetze';
  import Mediationsdiagramm from '../bausteine/Mediationsdiagramm.svelte';
  import Moderationsdiagramm from '../bausteine/Moderationsdiagramm.svelte';
  import { mediation, type Mediation } from '../lib/mediation';
  import ProzessWege from '../bausteine/ProzessWege.svelte';
  import { prozessRechneAsync, prozessErgebnis, prozessBefehl, prozessPruefung, moderatorWerteWahl, type Modell as ProzessModellNr, type ProzessDaten, type Prozess } from '../lib/prozess';
  import { eigeneWerte, kopiereProzess, prozessAn } from '../lib/prozesswahl';
  import { moderation, moderationBefehl, hilfsNamen, mittelwert, type Moderation } from '../lib/moderation';
  import { rechenText } from '../lib/eigenercode';
  import Einzelfalldiagramm from '../bausteine/Einzelfalldiagramm.svelte';
  import Kaplandiagramm from '../bausteine/Kaplandiagramm.svelte';
  import { kaplanAus, kaplanMit, schlageEreignis, einWertArt, type Kaplan } from '../lib/ueberleben';
  import { kaplanHinweise, ereignisWort, zensurWort } from '../lib/ueberlebensaetze';
  import BlattSterbetafel from '../bausteine/BlattSterbetafel.svelte';   // Später S-F (A): Sterbetafel und Cox mit zeitabhängiger Größe in der Karte Kaplan-Meier
  import { leereUeberleben, kopiereUeberleben, ueberlebenAn, zahlFeld, type UeberlebenWahl } from '../lib/ueberlebenwahl';
  import { sterbetafelAusKaplan, intervallAnfaenge } from '../lib/sterbetafel';
  import { sterbetafelFehlerSatz, sterbetafelHinweise, ZEITEINHEITEN, zeiteinheitWort, zeiteinheitId } from '../lib/sterbetafelsaetze';
  import { coxZeitVorbereiten, coxZeitPunkte, coxZeitInfo, schlageZeitSpaltenVor, type ZeitSpalten } from '../lib/ueberlebenkarte';
  import { coxZpRCode } from '../lib/coxzeit';
  import { unsterblichkeitSatz } from '../lib/coxzeitsaetze';
  import Raupendiagramm from '../bausteine/Raupendiagramm.svelte';
  import MehrebenenZusatz from '../bausteine/MehrebenenZusatz.svelte';
  import MetaEingabe from '../bausteine/MetaEingabe.svelte';
  import ZweiSpalten from '../bausteine/ZweiSpalten.svelte';
  import MetaZusatz from '../bausteine/MetaZusatz.svelte';
  import FehlendLittle from '../bausteine/FehlendLittle.svelte';
  import RegelkarteBlock from '../bausteine/RegelkarteBlock.svelte';
  import MatchingBlock from '../bausteine/MatchingBlock.svelte';
  import KurvenAnpassung from '../bausteine/KurvenAnpassung.svelte';
  import KalibrierBlock from '../bausteine/KalibrierBlock.svelte';
  import MesssystemBlock from '../bausteine/MesssystemBlock.svelte';
  import BayesMehrBlock from '../bausteine/BayesMehrBlock.svelte';
  import ImputationBlock from '../bausteine/ImputationBlock.svelte';
  import RaschBlock from '../bausteine/RaschBlock.svelte';
  import Irt2plBlock from '../bausteine/Irt2plBlock.svelte';
  import KorrespondenzBlock from '../bausteine/KorrespondenzBlock.svelte';
  import MdsBlock from '../bausteine/MdsBlock.svelte';
  import GrmBlock from '../bausteine/GrmBlock.svelte';
  import DifBlock from '../bausteine/DifBlock.svelte';
  import BaumBlock from '../bausteine/BaumBlock.svelte';
  import KnnBlock from '../bausteine/KnnBlock.svelte';
  import PanelBlock from '../bausteine/PanelBlock.svelte';
  import IvBlock from '../bausteine/IvBlock.svelte';
  import DidBlock from '../bausteine/DidBlock.svelte';
  import RdBlock from '../bausteine/RdBlock.svelte';
  import NetzBlock from '../bausteine/NetzBlock.svelte';
  import ProfilBlock from '../bausteine/ProfilBlock.svelte';
  import KlassenBlock from '../bausteine/KlassenBlock.svelte';
  import DelphiBlock from '../bausteine/DelphiBlock.svelte';
  import QBlock from '../bausteine/QBlock.svelte';
  import ConceptBlock from '../bausteine/ConceptBlock.svelte';
  import WachstumBlock from '../bausteine/WachstumBlock.svelte';
  import PyramideBlock from '../bausteine/PyramideBlock.svelte';
  import PfadBlock from '../bausteine/PfadBlock.svelte';
  import RobustBlock from '../bausteine/RobustBlock.svelte';
  import DiagnoseBlock from '../bausteine/DiagnoseBlock.svelte';
  import LogistikPruefen from '../bausteine/LogistikPruefen.svelte';
  import MehrebenenModelle from '../bausteine/MehrebenenModelle.svelte';
  import QcaBlock from '../bausteine/QcaBlock.svelte';
  import ZaehlkartenBlock from '../bausteine/ZaehlkartenBlock.svelte';
  import ExcelTiBlock from '../bausteine/ExcelTiBlock.svelte';
  import FaelleBlatt from '../bausteine/FaelleBlatt.svelte';
  import { faelleAusDaten, ergebnisVon as faelleErgebnisVon, type FaelleErgebnis } from '../lib/faelledaten';
  import { faellePruefliste } from '../lib/faellesaetze';
  import Forestplot from '../bausteine/Forestplot.svelte';
  import KreuzWege from '../bausteine/KreuzWege.svelte';
  import KreuzZusatz from '../bausteine/KreuzZusatz.svelte';
  import KreuzResiduen from '../bausteine/KreuzResiduen.svelte';
  import FaktorKmoBlock from '../bausteine/FaktorKmoBlock.svelte';
  import { masseBefehl, rechneMasse, type SpaltenArt } from '../lib/zusammenhangsmasse';
  import { zaehleSchichten, schichtWahlStandard, MH_MAX_SCHICHTEN, type SchichtDaten } from '../lib/schichtsaetze';
  import Trichterdiagramm from '../bausteine/Trichterdiagramm.svelte';
  import { metaPruefung, metaRCode, R_PAKETE_META, type Meta } from '../lib/metaanalyse';
  import { entwurf as metaEntwurf, metaDirekt } from '../lib/metaentwurf.svelte';
  import { frageVorschlag } from '../lib/beispielvorschlag.svelte';
  import EbenenHinweis from '../bausteine/EbenenHinweis.svelte';
  import RStart from '../bausteine/RStart.svelte';
  import { mehrebenenRechnen, metaRechnen, quantilRechnen, strafRechnen, diskriminanzRechnen, loglinearRechnen, manovaRechnen, probitRechnen, wlsRechnen, nlsRechnen, armutRechnen, ordregRechnen, multregRechnen, zaehlregRechnen, coxRechnen, coxZpRechnen, aftRechnen, frailtyRechnen, rStatus, rHalten, umfrageRechnen, R_PAKETE_UMFRAGE } from '../lib/rverfahren.svelte';
  import { gruppenRechnen, regressionRechnen } from '../lib/umfrage-gr-rechnen';
  import { rocEntfaelltSatz } from '../lib/umfrage-gr';
  import { liveRechner, rechnetVonSelbst, ABBLENDEN_NACH_MS, HINWEIS_NACH_MS } from '../lib/live';
  import { erkenneGruppierung, erkenneWachstum, erkenneKreuzung, MEB_GRUPPEN_WENIG, MEB_GRUPPEN_GUT, R_PAKETE_MEB, type Mehrebenen } from '../lib/mehrebenen';
  import { ebenenVorschlag, ebenenOeffnen } from '../lib/mebvorschlag.svelte';
  import { ebenenHinweisText } from '../lib/mehrebenensaetze';
  import OmegaZeile from '../bausteine/OmegaZeile.svelte';
  import SplitHalfBlock from '../bausteine/SplitHalfBlock.svelte';
  import KonfirmatorischeFa from '../bausteine/KonfirmatorischeFa.svelte';
  import { baueFaelle, einzelfallAus, einzelfallMit, type Einzelfall, type Richtung, type Zeile } from '../lib/einzelfall';
  import type { Gewicht, IccModell } from '../lib/uebereinstimmung';
  import type { TableItem } from '../engine/types';
  import { dgGrund, dgRat, type DgOptionen } from '../lib/diagramm';
  import DiagrammExport from '../bausteine/DiagrammExport.svelte';
  import BlattDiagramme from '../bausteine/BlattDiagramme.svelte';
  import BlattAnpassung from '../bausteine/BlattAnpassung.svelte';
  import BlattEinstichprobe from '../bausteine/BlattEinstichprobe.svelte';
  import BlattKursAnteil from '../bausteine/BlattKursAnteil.svelte';
  import BlattKursVarianz from '../bausteine/BlattKursVarianz.svelte';
  import { kursZielFrisch } from '../lib/kursziel';
  import BlattKursFTest from '../bausteine/BlattKursFTest.svelte';
  import BlattVielfalt from '../bausteine/BlattVielfalt.svelte';
  import BlattReferenz from '../bausteine/BlattReferenz.svelte';
  import BlattAusreisser from '../bausteine/BlattAusreisser.svelte';
  import BlattZufall from '../bausteine/BlattZufall.svelte';
  import { kopiereZufall, leereZufall, bGueltig, ganzeZahlAusText, type ZufallWahl } from '../lib/zufallswahl';
  import { zufallGrundText } from '../lib/zufallsaetze';
  import BlattPosthoc from '../bausteine/BlattPosthoc.svelte';
  import KontrasteBlock from '../bausteine/KontrasteBlock.svelte';
  import MwZweiBlock from '../bausteine/MwZweiBlock.svelte';
  import MwKontrasteEin from '../bausteine/MwKontrasteEin.svelte';
  import Anova3Block from '../bausteine/Anova3Block.svelte';
  import BlattRang from '../bausteine/BlattRang.svelte';
  import { wahlAktion, istPfeil } from '../lib/wahltasten';
  import RangEmpfehlung from '../bausteine/RangEmpfehlung.svelte';
  import type { RobustDaten } from '../bausteine/BlattRobust.svelte';
  import { jaNeinWerte, gemeinsamJaNein, alsNull1, mcnemarErgebnis, cochranErgebnis, type JaNein, type McNemarE, type CochranE } from '../lib/janein';
  import { jaNeinSatz } from '../lib/jaNeinSaetze';
  import { friedman, type Friedman } from '../lib/friedman';
  import { mannWhitney, kruskalWallis, wilcoxon, wilcoxonGrund, rangBefehl, rangVorschlag, type RangErgebnis, type RangVorschlag, type MannWhitney, type KruskalWallis, type Wilcoxon } from '../lib/rangtests';
  import { rangMitteText, rangTestName, rangPruefPunkt } from '../lib/rangsaetze';
  import { vorzeichenErgebnis, medianErgebnis, jtErgebnis, ksErgebnis, istWeitere, type JtWahl, type WeitereArt, type GruppeEin } from '../lib/rangweitereblatt';
  import { leereZusatz, kopiereZusatz, zusatzAn, umfrageTestWert, umfrageWahlAn, masseAn, prozentAn, prozentBasen, deltaAusText, reliabilitaetAusText, zahlAusText, alphaAus, tostAusGruppen, tostAusPaaren, rciAnzeige, type ZusatzWahl, type TostAnzeige, type RciAnzeige, type RciQuelle } from '../lib/aequirci';
  import BlattZusatz from '../bausteine/BlattZusatz.svelte';
  import { hierreg, hierregBefehl, hierBloecke, hierBlockVon, hierGueltig, type Hierreg } from '../lib/hierreg';
  import type { RegTerm } from '../lib/regfaktor';
  import { coxDaten, coxBefunde, coxRCode, R_PAKETE_COX } from '../lib/cox';
  import { AFT_VERTEILUNGEN, FRAILTY_GRUPPEN_WENIG, frailtyDaten, kennungsGruppen, aftRCode, frailtyRCode, verteilungName, verteilungWort, type AftVerteilung, type FrailtyArt, type FrailtyBindung } from '../lib/aft';
  import { katDaten, katRCode, R_PAKETE_ORD, R_PAKETE_MULT, R_PAKETE_ZAEHL, type KatArt, type OrdReg, type MultReg, type ZaehlReg } from '../lib/kategreg';
  import { katFaelle, katPruefliste, katVorschlaege, stufenMitFaellen } from '../lib/katpruefung';
  import { andereAlsZaehlwerte, modelleFuer, modellGilt, referenzGilt, zielArt, zusatzModelle, kursModelle, type ModellArt, type ModellWahl } from '../lib/kategwahl';
  import { leereVorh, kopiereVorh } from '../lib/vorhwahl';   // Später S-E: Quantilregression und Strafregression
  import { vorhFaelle, quantilBefunde, strafBefunde } from '../lib/vorhpruefung';
  import { QR_TAU_ANGEBOT, QR_B, QR_STARTWERT, quantilKiWahl, quantilTauGueltig, quantilTauGrundText, tauText, R_PAKETE_QUANTIL, type QuantilErgebnis } from '../lib/quantil';
  import { R_PAKETE_STRAF, STRAF_WDH, STRAF_STARTWERT, strafK, strafVollstaendig, strafAlphaName, type StrafErgebnis } from '../lib/strafreg';
  import { quantilWarum, quantilFachwort, quantilGerechnetBlatt, quantilRCode } from '../lib/quantilsaetze';
  import { strafWarum, strafFachwort, strafGerechnetBlatt, strafRCode } from '../lib/strafregsaetze';
  import BlattQuantil from '../bausteine/BlattQuantil.svelte';
  import BlattPenreg from '../bausteine/BlattPenreg.svelte';
  import ManovaFolge from '../bausteine/ManovaFolge.svelte';
  import DiskrStruktur from '../bausteine/DiskrStruktur.svelte';
  import BlattKurspaket from '../bausteine/BlattKurspaket.svelte';   // Kurs-Paket (Fachblatt KURSPAKET): Diskriminanzanalyse, loglineare Modelle, MANOVA, Probit, gewichtete Regression
  import BlattDiskriminanz from '../bausteine/BlattDiskriminanz.svelte';
  import BlattLoglinear from '../bausteine/BlattLoglinear.svelte';
  import { diskrDaten, diskrPunkte, diskrGerechnet, diskrWarum, R_PAKETE_DISKR, diskrRCode, type DiskrE } from '../lib/diskriminanz';
  import { logDaten, logPunkte, logGerechnet, logRCode, logWahlBereinigen, type LogE } from '../lib/loglinear';
  import { manovaDaten, manovaPunkte, manovaGerechnet, manovaRCode, type ManovaE } from '../lib/manova';
  import { armutDaten, armutPunkte, armutGerechnet, R_PAKETE_ARMUT, type ArmutE } from '../lib/armut';   // Abschnitt 3: Armut und Ungleichheit (survey)
  import BlattArmut from '../bausteine/BlattArmut.svelte';
  import { probitDaten, probitPunkte, probitGerechnet, probitRCode, probitWarum, type ProbitE } from '../lib/probit';
  import { wlsDaten, wlsPunkte, wlsGerechnet, wlsRCode, wlsWarum, wlsNichtFallgewicht, type WlsE } from '../lib/wls';
  import { nlsDaten, nlsPunkte, nlsGerechnet, nlsRCode, nlsWarum, NLS_FORMELN, nlsFormelName, nlsFormelText, istNlsArt, type NlsE, type NlsArt } from '../lib/nls';   // Abschnitt 5: nichtlineare Regression mit fester Formelauswahl
  import Nlsdiagramm from '../bausteine/Nlsdiagramm.svelte';
  import { gerechnetText, katFachwort, katWarum } from '../lib/kategregsaetze';
  import { artikelModul } from '../hilfe/artikel-laden';
  import { kartenGruppen, kartenSuche, kartenStichwoerter, ausgeblendet as fachAusgeblendet, fachName } from '../lib/fach';
  import { bootstrapKurz } from '../lib/bootstrapsaetze';
  import BlattKategorie from '../bausteine/BlattKategorie.svelte';
  import KatVorschlag from '../bausteine/KatVorschlag.svelte';
  import { stufenGrund } from '../lib/stufen';
  import { korrMatrix, MATRIX_GRENZE, type KorrMatrix } from '../lib/korrmatrix';
  import { korrMatrixName, holmText } from '../lib/korrmatrixsaetze';
  import { freierName, gueltigerName, skalenwertBefehl, umpolBefehl, umpolSpanne } from '../lib/skalabau';
  import { gewichtLage, aktivesGewicht, oeffneGewichtDialog, gewichtFehlerSatz, gewichtsWerte } from '../lib/fallgewicht.svelte';
  import { gewichtStellen, verwendetGewicht, stellenTitel, BESCHREIBEND, klumpenfreiFuer, DESIGN_ANGEBUNDEN } from '../lib/gewichtkarten';
  import { gewichtetBeschreiben, gewichtetLeer, type GewichteteKarte, type GewichtetE } from '../lib/gewichtbeschreibend';
  import { umfrageVerteilungRechnen, umfrageKreuzRechnen } from '../lib/umfragerechnen';   // Später S-D2 (A2): Umfragegewicht mit survey
  import UmfrageWege from '../bausteine/UmfrageWege.svelte';
  import { nutztDesign, abdruckMitRechenweg, gewichtStatus, gewichtSatz, designInfoSatz, designKleinSatz, entwurfWorte, klumpenSperrSatz, sperrSatz, kishSatz, erweitern, ERWEITERN_MAX, gewichtBefehl, HINWEIS_NICHT_VERWENDET, GewichtFehler } from '../lib/gewichte';
  import KategorienBlatt from '../bausteine/KategorienBlatt.svelte';
  import TabelleBlatt from '../bausteine/TabelleBlatt.svelte';
  import AmtlichBlatt from '../bausteine/AmtlichBlatt.svelte';
  import { neuesKatBlatt, katVorpruefung } from '../lib/kategorienblatt';
  import BlattZeitreihe from '../bausteine/BlattZeitreihe.svelte';   // Später S-E: Zeitreihen (JavaScript) und Clusteranalyse (R)
  import BlattCluster from '../bausteine/BlattCluster.svelte';
  import { zeitreiheErgebnis, zeitreiheVorpruefung, zeitreiheGerechnetBlatt, prognoseBehalten, type ZeitreiheE } from '../lib/zeitreiheblatt';
  import { clusterBerechnen } from '../lib/clusterlauf';
  import { clusterVorpruefung, clusterGerechnetBlatt, type ClusterE } from '../lib/clusterblatt';
  import { clusterCodeSatz, WARD_MAX } from '../lib/cluster';
  import { zaehle } from '../lib/zaehlen';

  /** `nurRechnen`: Das Blatt zeichnet nichts, sondern rechnet nur neu (Bericht und Export, Abnahme 4, B1); `ende` meldet, ob das gelang. `mitR`: auch ein R-Verfahren (R wird dafür geladen). */
  let { id, nurRechnen = false, mitR = false, ende }: { id: string; nurRechnen?: boolean; mitR?: boolean; ende?: (ok: boolean) => void } = $props();

  /* ---------- Hilfen über die Daten ---------- */
  const idx = (n: string) => s.spalten.findIndex(x => x.name === n);
  /** Die gültigen Werte einer Spalte - einmal je Datenstand (lib/einmal.ts); nicht verändern. */
  const gueltigeWerte = (n: string): (string | number)[] => { const i = idx(n), sp = s.spalten[i]; return einmal(s.zeilen, `gueltig|${i}|${fehlendSchluessel(sp)}`, () => s.zeilen.map(z => z[i]).filter(v => v !== null && v !== undefined && !(typeof v === 'number' && istFehlend(sp, v))) as (string | number)[]); };
  /** Alle Werte einer Spalte (auch Lücken) - einmal je Datenstand; nicht verändern. */
  const spaltenWerte = (n: string) => { const i = idx(n); return einmal(s.zeilen, `alle|${i}`, () => s.zeilen.map(z => z[i])); };
  const verschiedeneWerte = (n: string): number => { const i = idx(n), sp = s.spalten[i]; return einmal(s.zeilen, `verschieden|${i}|${fehlendSchluessel(sp)}`, () => new Set(gueltigeWerte(n)).size); };
  const ctx = { binaer: n => jaNeinVon(n) !== null, verschieden: n => (istSetName(n) ? s.sets.find(x => '$' + x.name === n)?.spalten.length ?? 0 : verschiedeneWerte(n)), gueltig: n => (istSetName(n) ? mehrfachFuer(n)?.faelle ?? 0 : gueltigeWerte(n).length), istZahl: n => spalteNach(n)?.art === 'zahl', ordinal: n => spalteNach(n)?.niveau === 'ordinal', nominal: n => spalteNach(n)?.niveau === 'nominal', bezeichnung: n => lesbar(spalteNach(n), true), logistik: n => { const sp = spalteNach(n); return sp ? logistikKodierung(sp, gueltigeWerte(n), logUmkehr, s.spalten.map(x => x.name)) : null; }, zielArt: n => { const sp = spalteNach(n); return sp ? zielArt(sp, verschiedeneWerte(n)) : null; }, faktor: n => { const sp = spalteNach(n); return sp ? regFaktor(sp, gueltigeWerte(n), s.spalten.map(x => x.name)) : null; }, get fa() { return faWahl; } } satisfies Ctx;
  /** Die Personen mit beiden Angaben als Zahlenpaare (ohne Lücken und ohne Werte, die als „keine Angabe“ gelten). */
  const zahlenPaare = (na: string, nb: string): [number, number][] => {
    const a = idx(na), b = idx(nb), fa = fehlendMenge(spalteNach(na)), fb = fehlendMenge(spalteNach(nb));
    return s.zeilen.flatMap(z => (typeof z[a] === 'number' && typeof z[b] === 'number' && !fa.includes(z[a] as number) && !fb.includes(z[b] as number) ? [[z[a] as number, z[b] as number] as [number, number]] : []));
  };
  /** Die Paare zweier Spalten (beide mit Angabe), mit Häufigkeitsgewicht so oft wiederholt, wie das Gewicht der Zeile sagt (Fachblatt S-A, 1.6: gewichtet = erweitert). Wirft `GewichtFehler('zu-gross')` über 200 000 Zeilen. */
  const paareGewichtet = (na: string, nb: string): [string | number, string | number][] => {
    const a = idx(na), b = idx(nb), fa = fehlendMenge(spalteNach(na)), fb = fehlendMenge(spalteNach(nb)), w = gewichtLage().art === 'gilt' ? (gewichtLage() as { pruefung: { w: number[] } }).pruefung.w : [];
    const ok = (v: unknown, fe: Fehlmenge) => v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && fe.includes(v));
    const idxVoll = s.zeilen.map((z, i) => (ok(z[a], fa) && ok(z[b], fb) ? i : -1)).filter(i => i >= 0);
    return erweitern(idxVoll.map(i => [s.zeilen[i]![a]!, s.zeilen[i]![b]!] as [string | number, string | number]), idxVoll.map(i => w[i] ?? 0));
  };
  /** Ja/Nein-Festlegung einer Spalte (janein.ts): genau zwei Werte, 0/1 oder beschriftet; sonst `null`. Die schnelle Prüfung (zwei verschiedene Werte, einmal je Datenstand) kommt zuerst. */
  const jaNeinVon = (n: string, umkehr = false): JaNein | null => { const sp = istSetName(n) ? undefined : spalteNach(n); return sp && verschiedeneWerte(n) === 2 ? jaNeinWerte(sp, gueltigeWerte(n), umkehr) : null; };
  /** McNemar (zwei Spalten) oder Cochran-Q (drei und mehr) aus Ja/Nein-Spalten; `null`, wenn die Spalten nicht dieselben zwei Werte haben. */
  function jaNeinErgebnis(spalten: string[], umkehr: boolean): { typ: 'mcnemar'; e: McNemarE } | { typ: 'cochran'; e: CochranE } | null {
    const kod = gemeinsamJaNein(spalten.map(n => jaNeinVon(n, umkehr)));
    if (!kod) return null;
    const zahlS = spalten.map(n => spalteNach(n)?.art === 'zahl'), daten = vollstaendig(spalten).map(z => z.map((v, k) => alsNull1(v, kod, zahlS[k]!)));
    return spalten.length === 2 ? { typ: 'mcnemar', e: mcnemarErgebnis(spalten[0]!, spalten[1]!, daten.map(z => z[0]!), daten.map(z => z[1]!), kod, s.zeilen.length) } : { typ: 'cochran', e: cochranErgebnis(spalten, daten, kod, s.zeilen.length) };
  }
  /** Welcher Ja/Nein-Test gehört zu dieser Frage (G5, Wahl automatisch nach der Datenart)? */
  const jaNeinFall = (v: Verfahren, w: Werte): 'mcnemar' | 'cochran' | null => (v.id === 'praepost' && w.l1[0] && w.l2[0] && alleJaNein([w.l1[0], w.l2[0]], ctx) ? 'mcnemar' : v.id === 'messwiederholung' && w.l1.length >= 3 && alleJaNein(w.l1, ctx) ? 'cochran' : null);
  /** Friedman-Test (Rangtest zur Messwiederholung, nur ohne Gruppenspalte); `undefined`, wenn er sich nicht rechnen lässt. */
  function friedmanAusDaten(spalten: string[]): Friedman | undefined {
    if (aktivesGewicht()) return undefined;
    try { const voll = vollstaendig(spalten); return spalten.length >= 3 && voll.length >= 2 ? friedman(voll.map(z => z as number[]), spalten, stufenGrund(spalten, ctx)) : undefined; } catch { return undefined; }
  }
  /** Spricht etwas für den Friedman-Test (Schiefe, Ausreißer, gestufte Messgröße)? Für die Prüfliste vor dem Rechnen: nur die Verteilungen, ohne die Paarvergleiche zu rechnen. */
  function rangVorschlagMw(spalten: string[]): RangVorschlag | null {
    try { const voll = vollstaendig(spalten); return voll.length < 3 ? null : rangVorschlag(spalten.map((_, j) => voll.map(z => z[j] as number)), stufenGrund(spalten, ctx)); } catch { return null; }
  }
  /** „ja“ und „nein“ vertauschen (McNemar, Cochran-Q): rechnet aus den Daten neu, das Blatt bleibt sonst gleich. */
  function jaUmkehren(an: boolean) {
    const alt = blatt?.ergebnis as { typ?: string; e?: { vorher: string; nachher: string; spalten: string[] } } | null;
    if (!blatt || !alt?.e || (alt.typ !== 'mcnemar' && alt.typ !== 'cochran')) return;
    const neu = jaNeinErgebnis(alt.typ === 'mcnemar' ? [alt.e.vorher, alt.e.nachher] : alt.e.spalten, an);
    if (!neu) return;
    jaUmkehr = an; blatt.ergebnis = neu; void sichern();
    melde(L(`Jetzt zählt „${neu.e.ja.jaName}“ als „ja“.`, `Now "${neu.e.ja.jaName}" counts as "yes".`));
  }
  /** Die Werte einer Zahlenspalte je Gruppe der Gruppenspalte (ohne Lücken und „keine Angabe“-Werte), Gruppen aufsteigend (Zahlen nach Größe, Text nach Schrift). */
  const gruppenWerteListe = (gruppe: string, wert: string): { wert: string; name: string; werte: number[] }[] => {
    const ig = idx(gruppe), iv = idx(wert), fg = fehlendMenge(spalteNach(gruppe)), fv = fehlendMenge(spalteNach(wert));
    const m = new Map<string | number, number[]>();
    for (const z of s.zeilen) {
      const g = z[ig], v = z[iv];
      if (g === null || g === undefined || g === '' || (typeof g === 'number' && fg.includes(g)) || typeof v !== 'number' || fv.includes(v)) continue;
      (m.get(g) ?? m.set(g, []).get(g)!).push(v);
    }
    return [...m].sort(([a], [b]) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0)).map(([g, w]) => ({ wert: String(g), name: gruppenName(gruppe, g), werte: w }));
  };
  /** Field-Stufe 3b: Daten für „Robust (getrimmte Mittel)“ (Yuen, getrimmte Varianzanalyse) aus den Daten der Tabelle; `null`, wenn es nicht geht (Fallgewicht, Messwiederholung, zu wenig Werte). Wirft nie. */
  function robustDatenFuer(e: typeof erg): RobustDaten | null {
    if (!e || aktivesGewicht()) return null;
    try {
      if (e.typ === 'prae-post') return { art: 'gepaart', vorher: name(e.e.vorher), nachher: name(e.e.nachher), paare: zahlenPaare(e.e.vorher, e.e.nachher) };
      if (e.typ === 'zwei-gruppen') return { art: 'gruppen', gruppen: [e.e.a, e.e.b].map(g => ({ name: g.name, werte: e.werte[g.name] ?? [] })) };
      if (e.typ === 'anova') return { art: 'gruppen', gruppen: gruppenWerteListe(e.e.gruppenSpalte, e.e.abhaengig).map(g => ({ name: g.name, werte: g.werte })) };
    } catch { /* nichts anbieten */ }
    return null;
  }
  /** Der Rangtest zu einer Frage, gerechnet aus den Daten der Tabelle; `null`, wenn er sich nicht rechnen lässt (zu wenig Werte, keine Streuung). Wirft nie. */
  function rangAusDaten(art: 'zwei-gruppen' | 'anova' | 'prae-post', l1: string, l2: string, mw?: { a: string; b: string; werte: Record<string, number[]> }): RangErgebnis | null {
    if (aktivesGewicht()) return null;   // Rangtests rechnen jede Zeile einmal: mit Fallgewicht gesperrt (Fachblatt S-A, 1.5)
    try {
      if (art === 'prae-post') return wilcoxon(l1, l2, zahlenPaare(l1, l2), stufenGrund([l1, l2], ctx));
      if (art === 'anova') return kruskalWallis(l1, l2, gruppenWerteListe(l2, l1), stufenGrund([l1], ctx));
      return mw ? mannWhitney(l1, l2, { name: mw.a, werte: mw.werte[mw.a] ?? [] }, { name: mw.b, werte: mw.werte[mw.b] ?? [] }, stufenGrund([l1], ctx)) : null;
    } catch { return null; }
  }
  /** Gepaart, alle Veränderungen gleich groß: der t-Test geht nicht (keine Streuung). Ist die Veränderung nicht 0, lässt sich der Rangtest rechnen und steht zur Wahl;
   *  sind alle Paare ohne Unterschied, gibt es nichts zu testen (Grund `keinUnterschied`). */
  function ohneStreuungPaar(l1: string, l2: string) {
    const paare = zahlenPaare(l1, l2), grund = wilcoxonGrund(paare) ?? undefined;
    return { typ: 'ohne-streuung' as const, art: 'prae-post' as const, spalte: '', ...(grund ? { grund } : { rang: rangAusDaten('prae-post', l1, l2) as Wilcoxon ?? undefined }) };
  }
  /** Warum der Wilcoxon-Test nicht geht (weniger als zwei Paare mit Unterschied), als Meldung; sonst `null`. */
  function rangGrundText(l1: string, l2: string): string | null { const g = wilcoxonGrund(zahlenPaare(l1, l2)); return g ? wilcoxonGrundText(g) : null; }
  /** Spricht etwas für einen Rangtest (Abschlusstest F5: Schiefe, Ausreißer, gestufte Messgröße - nicht die Gruppengröße)? Für die Prüfliste vor dem Rechnen
   *  und den Satz unter dem Ergebnis, immer aus den aktuellen Daten (auch für alte Projekte, deren gespeicherter Vorschlag noch die Gruppengröße zählte). */
  function rangVorschlagFuer(art: 'gruppen' | 'prae-post', l1: string, l2: string): RangVorschlag | null {
    try {
      if (art === 'prae-post') { const pa = zahlenPaare(l1, l2); return pa.length < 3 ? null : rangVorschlag([pa.map(([a, b]) => Number((b - a).toPrecision(12)))], stufenGrund([l1, l2], ctx)); }
      const g = gruppenWerteListe(l2, l1); return g.length < 2 ? null : rangVorschlag(g.map(x => x.werte), stufenGrund([l1], ctx));
    } catch { return null; }
  }
  /** Die Fälle, bei denen alle genannten Spalten eine Angabe haben (Zeilen der Daten, in der Reihenfolge der Spalten; ohne Lücken, ohne „keine Angabe“-Werte). */
  const vollstaendig = (namen: string[]): (string | number)[][] => {
    const ix = namen.map(idx), sps = namen.map(n => spalteNach(n));
    return s.zeilen.flatMap(z => (ix.every((i, k) => z[i] !== null && z[i] !== undefined && z[i] !== '' && !(typeof z[i] === 'number' && istFehlend(sps[k], z[i] as number))) ? [ix.map(i => z[i] as string | number)] : []));
  };
  /** Je Kodierende eine Spalte über alle Zeilen der Daten; Lücken und „keine Angabe“-Werte sind null (Krippendorffs Alpha verträgt Lücken). */
  const kodierungen = (namen: string[]): (string | number | null)[][] => namen.map(n => {
    const i = idx(n), fe = fehlendMenge(spalteNach(n));
    return s.zeilen.map(z => { const v = z[i]; return v === null || v === undefined || v === '' || (typeof v === 'number' && fe.includes(v)) ? null : v; });
  });
  /** Skala für Krippendorffs Alpha aus dem Messniveau der gewählten Spalten (das niedrigste; Text nominal). */
  const interSkala = (namen: string[]) => alphaSkala(namen.map(n => ({ text: spalteNach(n)?.art === 'text', niveau: spalteNach(n)?.niveau })));
  const itemKarteVon = (namen: string[]) => itemKarte(namen.flatMap(n => { const sp = spalteNach(n); return sp ? [{ name: sp.name, bezeichnung: sp.bezeichnung, kurz: lesbar(sp, true) }] : []; }));
  const name = (n: string) => (spalteNach(n) ? lesbar(spalteNach(n), true) : n);   // eine Spalte, die es nicht mehr gibt, heißt wie in der Frage (D12)
  const gruppenName = (n: string, w: string | number) => spalteNach(n)?.werteLabels[String(w)] ?? dez(String(w));
  /** Anzeigename einer Stufe: bei Zahlen Wertebeschriftung oder Zahl, bei Text der Text selbst (kein Dezimalkomma in Namen wie „Gr. 1“). */
  const stufenName = (n: string, w: string | number) => (typeof w === 'number' ? gruppenName(n, w) : String(w));
  /* ---------- Zweite Gruppierung (G3) und Kontrollvariable (G6) ---------- */
  /** Die Stufen einer Gruppenspalte: Zahlen aufsteigend, Text nach Schrift (Deutsch) - wie die Vergleichsgruppe in regfaktor.ts; mit eindeutigen Anzeigenamen (doppelte Namen bekommen den Wert angehängt). */
  function stufenListe(n: string, roh: (string | number)[]): { roh: string | number; name: string }[] {
    const sortiert = [...new Set(roh)].sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'de')));
    const namen = sortiert.map(v => stufenName(n, v));
    return sortiert.map((v, i) => ({ roh: v, name: namen.indexOf(namen[i]!) === namen.lastIndexOf(namen[i]!) ? namen[i]! : `${namen[i]} (${v})` }));
  }
  /** Eingabe der zweifaktoriellen Varianzanalyse: die Personen mit Wert und beiden Gruppen (Stufen mit Anzeigenamen) und die Kodierung der Text-Gruppen für PSPP. */
  function anova2Eingabe(y: string, a: string, b: string): { d: Anova2Daten; ka: Kodierung; kb: Kodierung } {
    const voll = vollstaendig([y, a, b]);
    const sa = stufenListe(a, voll.map(z => z[1]!)), sb = stufenListe(b, voll.map(z => z[2]!));
    const na = new Map(sa.map(x => [x.roh, x.name])), nb = new Map(sb.map(x => [x.roh, x.name]));
    const kod = (n: string, st: typeof sa): Kodierung => ({ spalte: n, text: spalteNach(n)?.art !== 'zahl', werte: st.map(x => String(x.roh)) });
    return { d: { a: voll.map(z => na.get(z[1]!)!), b: voll.map(z => nb.get(z[2]!)!), y: voll.map(z => z[0] as number), aStufen: sa.map(x => x.name), bStufen: sb.map(x => x.name) }, ka: kod(a, sa), kb: kod(b, sb) };
  }
  /** Die Gruppenspalte der Kovarianzanalyse als Faktor mit 0/1-Hilfsspalten (auch eine Zahlenspalte ohne Niveau „nominal“: hier ist sie eine Gruppe). */
  function ancovaFaktor(n: string): RegFaktor | null {
    const sp = spalteNach(n);
    return sp ? regFaktor(sp.art === 'zahl' ? { ...sp, niveau: 'nominal' } : sp, gueltigeWerte(n), s.spalten.map(x => x.name)) : null;
  }
  /** Eingabe der Kovarianzanalyse: die Personen mit Wert, Gruppe und Kontrollvariable; Gruppen mit Anzeigenamen in der Reihenfolge des Faktors (Vergleichsgruppe zuerst). */
  function ancovaEingabe(y: string, g: string, x: string): { d: AncovaDaten; faktor: RegFaktor } | null {
    const faktor = ancovaFaktor(g); if (!faktor) return null;
    const voll = vollstaendig([y, g, x]), namen = new Map(faktor.stufen.map(st => [st.wert, st.name]));
    const schl = (v: string | number) => (faktor.text ? String(v) : String(Number(v)));
    return { faktor, d: { g: voll.map(z => namen.get(schl(z[1]!)) ?? ''), x: voll.map(z => z[2] as number), y: voll.map(z => z[0] as number), stufen: faktor.stufen.map(st => st.name) } };
  }
  /** Eingabe der Kovarianzanalyse mit mehreren Kontrollvariablen (und für die Steigungen je Gruppe auch bei einer): Personen mit Wert, Gruppe und allen Kontrollvariablen. */
  function ancovaEingabeMehr(y: string, g: string, xs: string[]): { d: AncovaMehrDaten; faktor: RegFaktor } | null {
    const faktor = ancovaFaktor(g); if (!faktor) return null;
    const voll = vollstaendig([y, g, ...xs]), namen = new Map(faktor.stufen.map(st => [st.wert, st.name]));
    const schl = (v: string | number) => (faktor.text ? String(v) : String(Number(v)));
    return { faktor, d: { g: voll.map(z => namen.get(schl(z[1]!)) ?? ''), xs: xs.map((_, i) => voll.map(z => z[2 + i] as number)), y: voll.map(z => z[0] as number), namen: xs, stufen: faktor.stufen.map(st => st.name) } };
  }
  /* ---------- Mehrfachantworten ---------- */
  /** Fälle ohne Ankreuzung mitzählen? (SPSS-Standard: nein - Basis sind die Fälle mit mindestens einer Ankreuzung.) */
  let mfMitNull = $state(false);
  const setZeilen = (id: string) => { const k = s.sets.find(x => '$' + x.name === id)?.spalten.length ?? 0; return L(`${k} Optionen`, `${k} options`); };
  /** Das Set (mit „$“ im Namen) mit allen Angaben aus den Daten rechnen; mit Gruppenspalte auch die Kreuztabelle. */
  function mehrfachFuer(setKennung: string, gruppenSpalte?: string, mitNull = mfMitNull): Mehrfach | null {
    const set = s.sets.find(x => '$' + x.name === setKennung); if (!set || set.spalten.some(n => idx(n) < 0)) return null;
    const ix = set.spalten.map(idx), gi = gruppenSpalte ? idx(gruppenSpalte) : -1, gsp = gruppenSpalte ? spalteNach(gruppenSpalte) : undefined;
    return mehrfachRechnen({
      set, optionsNamen: optionsNamenAus(set.spalten.map(n => spalteNach(n)?.bezeichnung ?? ''), set.spalten), zeilen: s.zeilen.map(z => ix.map(i => z[i])), fehlend: set.spalten.map(n => fehlendMenge(spalteNach(n))), mitNull,
      ...(gruppenSpalte && gi >= 0 && gsp ? { gruppe: { spalte: gruppenSpalte, name: name(gruppenSpalte), werte: s.zeilen.map(z => z[gi]), fehlend: fehlendMenge(gsp), stufenName: (w: string | number) => gruppenName(gruppenSpalte, w) } } : {})
    });
  }

  /* ---------- Neue Auswertung ---------- */
  /** Die Fragekarten in Bereichen, innerhalb nach Häufigkeit in der Bildungswissenschaft. */
  const KARTENGRUPPEN = $derived([
    { id: 'unterschied', titel: L('Unterschiede und Veränderung', 'Differences and change'), ids: ['gruppen', 'manova', 'kreuz', 'loglinear', 'praepost', 'messwiederholung', 'einzelfall'] },
    { id: 'zusammenhang', titel: L('Zusammenhänge und Vorhersage', 'Relationships and prediction'), ids: ['zusammenhang', 'korrmatrix', 'vorhersage', 'diskriminanz'] },
    { id: 'fragebogen', titel: L('Fragebogen und Messung', 'Questionnaire and measurement'), ids: ['skala', 'faktor', 'uebereinstimmung', 'kategorien'] },
    { id: 'beschreiben', titel: L('Beschreiben', 'Describing'), ids: ['verteilung', 'armut'] },
    { id: 'mixed', titel: L('Zahlen und Texte verbinden', 'Connecting numbers and texts'), ids: ['faelle'] },
    { id: 'muster', titel: L('Muster und Entwicklung', 'Patterns and development'), ids: ['zeitreihen', 'cluster'] },   // Später S-E: nur in den Fächern, die sie zeigen (lib/fach.ts)
    { id: 'weitere', titel: L('Weitere Verfahren', 'More methods'), ids: ['mehrebenen', 'meta', 'kaplanmeier', 'mediation', 'moderation'], zu: true }
  ]);
  /** „Wie im Kurs“ (Andreas 25.10.): dieselben Karten, geordnet wie in Statistikkursen. Je Feld die Karte und wo der Test im Ergebnis steht; null = gibt es so nicht. */
  const KURS_ZEILEN: { id: string; titel: string; felder: ({ karte: string; test: string; ziel?: KursZiel } | null)[] }[] = $derived([
    { id: 'eins', titel: L('Eine Stichprobe', 'One sample'), felder: [
      { karte: 'verteilung', ziel: 'anteil', test: L('Anteil mit einem festen Wert vergleichen (Binomialtest)', 'Compare a proportion with a fixed value (binomial test)') },
      { karte: 'verteilung', test: L('Mittelwert mit einem festen Wert vergleichen (t-Test bei einer Stichprobe)', 'Compare the mean with a fixed value (one-sample t test)') },
      { karte: 'verteilung', ziel: 'varianz', test: L('Streuung mit einem festen Wert vergleichen (χ²-Test für eine Varianz)', 'Compare the spread with a fixed value (chi-square test for one variance)') }] },
    { id: 'zwei', titel: L('Zwei unabhängige Stichproben', 'Two independent samples'), felder: [
      { karte: 'kreuz', test: L('χ²-Test der Kreuztabelle (2 × 2)', 'Chi-square test of the crosstab (2 × 2)') },
      { karte: 'gruppen', test: L('t-Test für unabhängige Stichproben', 'Independent samples t test') },
      { karte: 'gruppen', ziel: 'ftest', test: L('Streuungen der beiden Gruppen vergleichen (F-Test), unter dem t-Test', 'Compare the spread of the two groups (F test), below the t test') }] },
    { id: 'gepaart', titel: L('Zwei abhängige Stichproben (gepaart)', 'Two dependent samples (paired)'), felder: [
      { karte: 'praepost', test: L('McNemar-Test (beide Messungen Ja/Nein)', 'McNemar test (both measurements yes/no)') },
      { karte: 'praepost', test: L('t-Test für gepaarte Stichproben', 'Paired samples t test') },
      null] },
    { id: 'drei', titel: L('Drei und mehr Stichproben', 'Three or more samples'), felder: [
      { karte: 'kreuz', test: L('χ²-Test der Kreuztabelle', 'Chi-square test of the crosstab') },
      { karte: 'gruppen', test: L('Einfaktorielle Varianzanalyse', 'One-way analysis of variance') },
      { karte: 'gruppen', test: L('Levene-Test, unter der Varianzanalyse in „Weitere Auswertungen“', 'Levene\'s test, below the analysis of variance in "More results"') }] }
  ]);
  /** „Qualität und Prozess“ (Johannes 01.11.): Einstieg für Technik und Qualitätssicherung. Die Verfahren stecken als Blöcke unter anderen Karten; diese Kacheln öffnen die Karte und springen zum Block (wie „Wie im Kurs“). */
  const QUALITAET = $derived(qualitaetKarten());
  const qGlatt = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  function ordnungSetzen(o: 'frage' | 'kurs') { s.einst.ordnung = o; einstSpeichern(); }
  /** „Mein Fachgebiet“ (lib/fach.ts): welche Karten wo stehen. Das Fach entscheidet nur über die Liste, nie über das Rechnen. */
  const gruppenAnzeige = $derived(kartenGruppen(KARTENGRUPPEN, s.einst.fach));
  const versteckt = $derived(fachAusgeblendet(s.einst.fach, VERFAHREN.map(v => v.id)));
  /** Suche über den Karten: findet auch ausgeblendete. */
  let kartenText = $state('');
  const qualitaetTreffer = $derived(kartenText.trim() ? QUALITAET.filter(q => qGlatt(`${q.titel} ${q.zusatz} ${q.beispiel} ${q.wort}`).includes(qGlatt(kartenText.trim()))) : []);
  /** Stichwörter aus der Hilfe je Karte: erst beim ersten Suchen geladen (die Artikel sind ein eigener Baustein). */
  let kartenSw = $state<{ sprache: string; sw: Record<string, string> } | null>(null);
  $effect(() => {
    const sp = s.einst.sprache;
    if (!kartenText.trim() || kartenSw?.sprache === sp) return;
    artikelModul(sp).then(m => { kartenSw = { sprache: sp, sw: kartenStichwoerter(m.artikelListe(sp)) }; }).catch(() => { /* ohne Netz: nur Titel, Zusatz, Beispiel */ });
  });
  const kartenTreffer = $derived(kartenSuche(kartenText, s.einst.fach, kartenSw?.sw));
  /** „Alle anzeigen“: die ausgeblendeten Karten für diesen Besuch zeigen (ändert das Fachgebiet nicht). */
  let versteckteZeigen = $state(false);
  let verfahren = $state<Verfahren | null>(null);
  let werte = $state<Werte>({ l1: [], l2: [], l3: [], l4: [] });
  let offen = $state<'l1' | 'l2' | 'l3' | 'l4' | null>('l1');
  /** Optionale Lücken, bei denen „Ohne … weiter“ gewählt wurde (damit sie nicht wieder aufgehen). */
  let uebersprungen = $state<string[]>([]);
  let rechnet = $state(false);
  /** Fehlermeldung von R beim Mehrebenen-Modell (die Seite bleibt bei der Frage). */
  let mebFehler = $state('');
  /** Kaplan-Meier: welcher der zwei Werte der Ereignisspalte das Ereignis ist (null = Vorschlag von Statable). */
  let kmWahl = $state<0 | 1 | null>(null);
  /** Logistische Regression: „Ereignis umkehren“ gegenüber der festen Regel (Zahlen der größere Wert, Text die alphabetisch zweite Antwort). */
  let logUmkehr = $state(false);
  /** McNemar und Cochran-Q: „ja“ und „nein“ gegenüber der festen Regel vertauscht (janein.ts). */
  let jaUmkehr = $state(false);
  /** Bei genau zwei Zahlenspalten kann die Art der Übereinstimmung gewählt werden; sonst wählt Statable (null). */
  let uebWunsch = $state<'kappa' | 'icc' | null>(null);
  /** Faktorenanalyse (Abschlusstest F3): Methode und Zahl der Faktoren (null = Kaiser-Kriterium). */
  let faWahl = $state<FaWahl>({ methode: 'pc', zahl: null, grenze: 0.3 });
  /** „Weitere Wege“: Äquivalenztest (G15) und Reliable Change Index (G16) - Wahl der Frage, gilt für zwei Gruppen und Prä-Post (siehe `zusEff`). */
  let zus = $state<ZusatzWahl>(leereZusatz());
  let randKey = $state<string | null>(null);
  /** Karte, auf die zuletzt gezeigt wurde (Maus oder Tab) - der Rand erklärt sie. Bleibt stehen, wenn die Maus zum Rand wandert. */
  let kartenBlick = $state<string | null>(null);
  /** Spalten im Kachelraster (aus dem Browser gelesen): eine Gruppe nimmt so viele, wie sie Karten hat, höchstens alle. */
  let kachelSpalten = $state(1);
  function spaltenZaehlen(el: HTMLElement) {
    // Selbst gerechnet wie auto-fill: der Browser zählt sonst die Spalten mit, die eine zu breite Gruppe neu anlegt.
    const zaehle = () => {
      const st = getComputedStyle(el), rem = parseFloat(getComputedStyle(document.documentElement).fontSize), min = parseFloat(st.getPropertyValue('--kachel-min')) * rem, luecke = parseFloat(st.columnGap) || 0;
      kachelSpalten = Math.max(1, Math.floor((el.clientWidth + luecke) / (min + luecke)));
    };
    zaehle();
    const ro = new ResizeObserver(zaehle); ro.observe(el);
    return { destroy: () => ro.disconnect() };
  }
  /** Fortschritt des Bootstrap (0 bis 1), solange die Mediation rechnet. */
  let fortschritt = $state(0);
  const luecke = $derived(verfahren?.luecken.find(l => l.schluessel === offen) ?? null);
  /** Die Liste klappt mit Animation zu: Ein Klick in die ausblendende Liste kommt an, wenn `luecke` schon `null` ist (Liste geschlossen, z. B. Klick auf das Feld, dessen Liste schon offen war). Die Handler nehmen dann die zuletzt offene Lücke. */
  let lueckeMerk: Luecke | null = null;
  $effect.pre(() => { if (luecke) lueckeMerk = luecke; });
  const lk = () => (luecke ?? lueckeMerk)!;
  /** Die Spalten, die in die offene Lücke passen; nach festgelegten Skalen gegliedert, sonst bei Fragebogen-Kürzeln (FG01 …) nach Block. */
  const wahlListe = $derived(luecke ? [...s.spalten, ...(verfahren?.id === 'verteilung' || (verfahren?.id === 'kreuz' && luecke.schluessel === 'l1') ? nutzbareSets().map(setAlsSpalte) : [])].filter(sp => luecke.passt(sp, ctx) && !((verfahren?.id === 'einzelfall' || verfahren?.id === 'armut' || verfahren?.id === 'kaplanmeier' || verfahren?.id === 'faelle' || verfahren?.id === 'mehrebenen' || (verfahren?.id === 'zusammenhang' && luecke.schluessel === 'l3') || (verfahren?.id === 'gruppen' && (luecke.schluessel === 'l3' || luecke.schluessel === 'l4'))) && (['l1', 'l2', 'l3', 'l4'] as const).some(k => k !== luecke.schluessel && werte[k].includes(sp.name) && !(verfahren?.id === 'kaplanmeier' && ((k === 'l3' && luecke.schluessel === 'l4') || (k === 'l4' && luecke.schluessel === 'l3')))))) : []);   // Kaplan-Meier: die Gruppen-Spalte darf auch eine Spalte der Cox-Regression sein

  const wahlGruppen = $derived(spaltenGruppen(wahlListe, nutzbareSkalen()));
  /** Blöcke (FG …), aus denen Fragen in einer Skala stehen: der Rest heißt dann „Übrige: FG03 bis FG77“. */
  const skalaStaemme = $derived(new Set((wahlGruppen ?? []).filter(g => g.skala).flatMap(g => g.spalten.map(x => namensStamm(x.name)))));
  /** Alle Fragen einer Skala auf einmal wählen (oder alle abwählen, wenn schon alle gewählt sind). */
  function skalaWaehlen(l: 'l1' | 'l2' | 'l3' | 'l4', namen: string[]) {
    const alle = namen.every(n => werte[l].includes(n));
    werte[l] = alle ? werte[l].filter(n => !namen.includes(n)) : [...werte[l], ...namen.filter(n => !werte[l].includes(n))];
  }
  /** Alle Spalten der offenen Lücke wählen oder (wenn schon alle gewählt sind) abwählen. */
  function alleWaehlen(l: 'l1' | 'l2' | 'l3' | 'l4') {
    jaUmkehr = false;
    const namen = wahlListe.map(x => x.name);
    skalaWaehlen(l, namen);
    melde(namen.every(n => werte[l].includes(n)) ? L(`${namen.length} gewählt.`, `${namen.length} selected.`) : L('Alle abgewählt.', 'All deselected.'));
  }
  /** Mit gedrückter Maustaste ein Rechteck über mehrere Felder aufziehen (wie im Datei-Manager): alle Felder, die das Rechteck berühren, werden gewählt - oder abgewählt, wenn das erste Feld schon gewählt war. Zieht man das Rechteck wieder kleiner, kehren die Felder zurück. Touch bleibt beim Scrollen. */
  let ziehen: { l: 'l1' | 'l2' | 'l3' | 'l4'; an: boolean; start: string; bewegt: boolean; x: number; y: number; vorher: string[] } | null = null;
  const optionName = (t: EventTarget | null) => { const o = (t as Element | null)?.closest?.('#wahl .option'); return o ? (o.querySelector('input') as HTMLInputElement | null)?.value : undefined; };
  function ziehBewegt(ev: PointerEvent) {
    const z = ziehen; if (!z) return;
    const x0 = Math.min(z.x, ev.clientX), x1 = Math.max(z.x, ev.clientX), y0 = Math.min(z.y, ev.clientY), y1 = Math.max(z.y, ev.clientY);
    const drin: string[] = [];
    for (const o of document.querySelectorAll<HTMLElement>('#wahl .option')) {
      const r = o.getBoundingClientRect();
      if (r.right < x0 || r.left > x1 || r.bottom < y0 || r.top > y1) continue;
      const n = (o.querySelector('input') as HTMLInputElement | null)?.value;
      if (n !== undefined) drin.push(n);
    }
    if (!z.bewegt && !drin.some(n => n !== z.start)) return;
    if (!z.bewegt) { z.bewegt = true; window.getSelection()?.removeAllRanges(); }
    const max = verfahren?.luecken.find(x => x.schluessel === z.l)?.hoechstens;
    let neu = z.an ? [...z.vorher] : z.vorher.filter(n => !drin.includes(n));
    if (z.an) for (const n of drin) if (!neu.includes(n) && !(max && neu.length >= max)) neu.push(n);
    werte[z.l] = neu;
    jaUmkehr = false;
  }
  function ziehEnde() {
    window.removeEventListener('pointermove', ziehBewegt);
    window.removeEventListener('pointerup', ziehEnde);
    window.removeEventListener('pointercancel', ziehEnde);
    const z = ziehen; ziehen = null;
    if (z?.bewegt) melde(Lp(werte[z.l].length, `${werte[z.l].length} Spalte gewählt.`, `${werte[z.l].length} Spalten gewählt.`, `${werte[z.l].length} column selected.`, `${werte[z.l].length} columns selected.`));
  }
  function ziehStart(ev: PointerEvent) {
    if (lk().wahl !== 'mehrere' || ev.button !== 0 || ev.pointerType === 'touch') return;
    const name = optionName(ev.target);
    if (name === undefined) return;
    const l = lk().schluessel;
    ziehen = { l, an: !werte[l].includes(name), start: name, bewegt: false, x: ev.clientX, y: ev.clientY, vorher: [...werte[l]] };
    window.addEventListener('pointermove', ziehBewegt);
    window.addEventListener('pointerup', ziehEnde);
    window.addEventListener('pointercancel', ziehEnde);
  }
  /** Alles gewählt. Beim Ändern eines geöffneten Blatts zählt auch eine noch offene Mehrfachauswahl (mit genug Spalten), damit jedes Anklicken sofort wirkt; bei „Neue Auswertung“ erst nach „Weiter“. */
  const fertigGewaehlt = $derived(!!verfahren && verfahren.luecken.every(l => werte[l.schluessel].length >= (l.mindestens ?? 1)) && (!offen || (id !== 'neu' && luecke?.wahl === 'mehrere')));

  /** „Neue Auswertung“ startet leer: Kommt man von einem fertigen Blatt zurück, gelten Art und Auswahl der letzten Frage nicht mehr. */
  let letzteId = untrack(() => id);
  $effect(() => { const jetzt = id; if (jetzt === 'neu' && letzteId !== 'neu') { verfahren = null; zus = leereZusatz(); werte = { l1: [], l2: [], l3: [], l4: [] }; offen = 'l1'; uebWunsch = null; randKey = null; uebersprungen = []; } letzteId = jetzt; });
  // (Live) beim Wechsel zu „Neue Auswertung“ vergisst der Editor das bisherige Blatt
  $effect(() => { if (id === 'neu') untrack(() => { liveId = null; gerechnetKey = ''; rechner.verwerfe(); }); });
  /** Kommt ein Vorschlag vom Hinweis „Die Daten sind in Gruppen eingeteilt“, öffnet die Frage schon ausgefüllt (Mehrebenenmodell). */
  $effect(() => {
    const v = ebenenVorschlag.w;
    if (!v || id !== 'neu') return;
    untrack(() => {
      verfahren = VERFAHREN.find(x => x.id === 'mehrebenen')!; werte = { l1: [...v.l1], l2: [...v.l2], l3: [...v.l3], l4: [] };
      offen = null; uebersprungen = []; uebWunsch = null; randKey = null; mebFehler = ''; ebenenVorschlag.w = null; zus = leereZusatz();
    });
    tick().then(() => document.getElementById('f2-t')?.focus());
  });
  /** Vom Beispiel-Begleiter: die Frage kommt schon ausgefüllt. */
  $effect(() => {
    const v = frageVorschlag.v;
    if (!v || id !== 'neu') return;
    untrack(() => {
      const ver = VERFAHREN.find(x => x.id === v.art); frageVorschlag.v = null; if (!ver) return;
      verfahren = ver; werte = { l1: [...v.w.l1], l2: [...v.w.l2], l3: [...v.w.l3], l4: [...v.w.l4] };
      offen = null; uebersprungen = []; uebWunsch = null; randKey = null; mebFehler = ''; kmWahl = null; logUmkehr = false; jaUmkehr = false; zus = leereZusatz();
    });
    tick().then(() => document.getElementById('f2-t')?.focus());
  });
  /** Von der Startseite („Studien zusammenfassen“): gleich die Meta-Analyse öffnen. */
  $effect(() => {
    if (!metaDirekt.an || id !== 'neu') return;
    untrack(() => { metaDirekt.an = false; waehleArt(VERFAHREN.find(x => x.id === 'meta')!); });
  });
  /** Das Feld in „Wie im Kurs“, mit dem die Karte geöffnet wurde: das Blatt springt im Ergebnis zu diesem Test (F-Test, Binomialtest, χ²-Test für eine Varianz). */
  let kursZiel = $state<KursZiel | null>(null);
  function waehleArt(v: Verfahren, ziel: KursZiel | null = null) { kursZiel = ziel; mebFehler = ''; kmWahl = null; logUmkehr = false; jaUmkehr = false; zus = leereZusatz(); verfahren = v; uebWunsch = null; faWahl = { methode: 'pc', zahl: null, grenze: 0.3 }; uebersprungen = v.luecken.filter(l => l.still).map(l => l.schluessel); werte = { l1: [], l2: [], l3: [], l4: [] }; offen = v.id === 'meta' ? null : 'l1'; tick().then(() => document.querySelector<HTMLElement>(v.id === 'meta' ? 'input[name="meta-art"]' : '#wahl input')?.focus()); }
  /** Einzelwahl per Tastatur (Befund 1): Pfeiltasten merken nur vor; Enter/Leertaste, Klick oder Tab aus der Gruppe übernehmen (`lib/wahltasten.ts`). */
  let wahlVorgemerkt: { l: 'l1' | 'l2' | 'l3' | 'l4'; name: string } | null = null;
  let wahlPfeil = false;
  function wahlTaste(ev: KeyboardEvent) {
    if (istPfeil(ev.key)) { wahlPfeil = true; setTimeout(() => (wahlPfeil = false), 0); return; }
    const radio = ev.target instanceof HTMLInputElement && ev.target.type === 'radio' ? ev.target : null;
    if (wahlAktion({ art: 'keydown', taste: ev.key, aufRadio: !!radio }) === 'setzen' && radio) { ev.preventDefault(); setze(lk().schluessel, radio.value, false); }
  }
  function wahlAendert(l: 'l1' | 'l2' | 'l3' | 'l4', name: string) {
    if (wahlAktion({ art: 'change', vonPfeil: wahlPfeil }) === 'vormerken') wahlVorgemerkt = { l, name }; else setze(l, name, false);
  }
  function wahlVerlassen(ev: FocusEvent) {
    const aus = !(ev.relatedTarget instanceof Node && (ev.currentTarget as HTMLElement).contains(ev.relatedTarget));
    if (wahlAktion({ art: 'focusout', ausserhalb: aus, vorgemerkt: !!wahlVorgemerkt }) === 'uebernehmen' && wahlVorgemerkt) { const v = wahlVorgemerkt; setze(v.l, v.name, false, true); }
  }
  function setze(l: 'l1' | 'l2' | 'l3' | 'l4', name: string, mehrere: boolean, ohneSprung = false) {
    jaUmkehr = false; wahlVorgemerkt = null;
    if (mehrere) {
      const max = verfahren?.luecken.find(x => x.schluessel === l)?.hoechstens;
      if (max && !werte[l].includes(name) && werte[l].length >= max) { melde(Lp(max, `Höchstens ${max} Spalte.`, `Höchstens ${max} Spalten.`, `At most ${max} column.`, `At most ${max} columns.`)); return; }
      werte[l] = werte[l].includes(name) ? werte[l].filter(x => x !== name) : [...werte[l], name];
    }
    else {
      werte[l] = [name];
      if (l === 'l1') logUmkehr = false;   // anderes Ziel: wieder die feste Regel für das Ereignis
      if (ohneSprung) return;
      const naechste = verfahren!.luecken.find(x => x.schluessel !== l && !werte[x.schluessel].length && !uebersprungen.includes(x.schluessel));
      offen = naechste?.schluessel ?? null;
      tick().then(() => (offen ? document.querySelector<HTMLElement>('#wahl input') : (document.getElementById('f2-t') ?? document.querySelectorAll<HTMLElement>('.lueckensatz .luecke')[verfahren?.luecken.findIndex(x => x.schluessel === l) ?? 0]))?.focus());
    }
  }

  /** Sieht die Tabelle „lang“ aus (eine Zeile je Messung)? Dann zeigen wir den Weg zum Umformen. */
  const langHinweis = $derived.by(() => {
    if (verfahren?.id !== 'messwiederholung') return false;
    const zahlen = s.spalten.filter(sp => verfahren!.luecken[0]!.passt(sp, ctx)).length;
    const doppelt = s.spalten.some(sp => /^(nr|id|lfdn|lfd_?nr|nummer|fall|case|code|proband|vp)$/i.test(sp.name) && ctx.gueltig(sp.name) > ctx.verschieden(sp.name));
    return zahlen < 3 || doppelt;
  });

  /** Einzelfall: die Zeilen der Daten als Messungen (Wert, Phase, Zeitpunkt, Fall); Lücken und „keine Angabe“-Werte werden zu null. */
  function einzelfallZeilen(w: Werte): Zeile[] {
    const im = idx(w.l1[0]!), ip = idx(w.l2[0]!), iz = w.l3[0] ? idx(w.l3[0]) : -1, ifa = w.l4[0] ? idx(w.l4[0]) : -1;
    const fm = fehlendMenge(spalteNach(w.l1[0]!)), fp = fehlendMenge(spalteNach(w.l2[0]!)), ff = w.l4[0] ? fehlendMenge(spalteNach(w.l4[0])) : [];
    const gut = (v: string | number | null | undefined, fe: Fehlmenge) => (v === null || v === undefined || v === '' || (typeof v === 'number' && fe.includes(v)) ? null : v);
    return s.zeilen.map(z => ({ mess: typeof z[im] === 'number' && !fm.includes(z[im] as number) ? (z[im] as number) : null, phase: gut(z[ip], fp), zeit: iz >= 0 ? (z[iz] ?? null) : undefined, fall: ifa >= 0 ? gut(z[ifa], ff) : undefined }));
  }

  /** Kaplan-Meier: die Beobachtungen (Gruppe, Zeit, Index des Statuswerts) aus den Zeilen der Daten; Zeilen ohne Zeit, Status oder Gruppe werden ausgelassen. */
  function kaplanDaten(w: Werte) {
    const iz = idx(w.l1[0]!), ie = idx(w.l2[0]!), ig = w.l3[0] ? idx(w.l3[0]) : -1;
    const fz = fehlendMenge(spalteNach(w.l1[0]!)), fe = fehlendMenge(spalteNach(w.l2[0]!)), fg = w.l3[0] ? fehlendMenge(spalteNach(w.l3[0])) : [];
    const gut = (v: string | number | null | undefined, fl: Fehlmenge) => (v === null || v === undefined || v === '' || (typeof v === 'number' && fl.includes(v)) ? null : v);
    // Später S-F: Cox mit zeitabhängiger Größe - die Tabelle hat mehrere Zeilen je Person; die Kurve und die Zählung nehmen die LETZTE Zeile jeder Person (ihre Zeit und ihr Ereignis sind die der Person)
    const zw = zusEff.ueberleben?.zeit, ik = zw?.an && zw.kennung ? idx(zw.kennung) : -1;
    const alle = s.zeilen.map(z => ({ t: typeof z[iz] === 'number' && !fz.includes(z[iz] as number) ? (z[iz] as number) : null, e: gut(z[ie], fe), g: ig >= 0 ? gut(z[ig], fg) : 0, k: ik >= 0 ? gut(z[ik], fehlendMenge(spalteNach(zw!.kennung))) : null }));
    let brauchbar = alle.filter(r => r.t !== null && r.t >= 0 && r.e !== null && r.g !== null && (ik < 0 || r.k !== null));
    const ungueltig = s.zeilen.length - brauchbar.length;
    if (ik >= 0) {
      const letzte = new Map<string | number, (typeof alle)[number]>();
      for (const r of brauchbar) { const alt = letzte.get(r.k!); if (!alt || r.t! >= alt.t!) letzte.set(r.k!, r); }
      brauchbar = [...letzte.values()];
    }
    const sortiere = (a: (string | number)[]) => [...new Set(a)].sort((x, y) => (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'de')));
    const status = sortiere(brauchbar.map(r => r.e!)), grp = sortiere(brauchbar.map(r => r.g!));
    return {
      roh: brauchbar.map(r => [grp.indexOf(r.g!), r.t!, (status.indexOf(r.e!) === 0 ? 0 : 1)] as [number, number, 0 | 1]),
      statusWerte: status.map(v => ({ schluessel: v, text: gruppenName(w.l2[0]!, v) })),
      gruppenNamen: w.l3[0] ? grp.map(v => gruppenName(w.l3[0]!, v)) : [''],
      negativ: alle.filter(r => r.t !== null && r.t < 0).length,
      ausgelassen: ik >= 0 ? ungueltig : s.zeilen.length - brauchbar.length
    };
  }
  function kaplanBerechne(w: Werte, wahl: 0 | 1 | null): Kaplan | null {
    const d = kaplanDaten(w);
    if (d.negativ || !d.roh.length) return null;
    // Nur ein Wert (Prüfung B5): Steht er für das Ereignis, rechnet Statable wie R survfit (alle mit Ereignis, keine Zensur); steht er für zensiert, gibt es keine Kurve.
    if (d.statusWerte.length === 1) {
      if (einWertArt(d.statusWerte[0]!).art !== 'ereignis') return null;
      return kaplanAus(d.roh.map(([g, t]) => [g, t, 1] as [number, number, 0 | 1]), { zeit: w.l1[0]!, ereignis: w.l2[0]!, gruppe: w.l3[0] ?? '', gruppenNamen: d.gruppenNamen, werte: [L('zensiert (kommt nicht vor)', 'censored (does not occur)'), d.statusWerte[0]!.text], ereignisIndex: 1, vorschlagGrund: '', zeilen: s.zeilen.length, ausgelassen: d.ausgelassen, einWert: true });
    }
    if (d.statusWerte.length !== 2) return null;
    const vor = schlageEreignis(d.statusWerte);
    return kaplanAus(d.roh, { zeit: w.l1[0]!, ereignis: w.l2[0]!, gruppe: w.l3[0] ?? '', gruppenNamen: d.gruppenNamen, werte: [d.statusWerte[0]!.text, d.statusWerte[1]!.text], ereignisIndex: wahl ?? vor.index, vorschlagGrund: vor.grund, vorschlagIndex: vor.index, zeilen: s.zeilen.length, ausgelassen: d.ausgelassen });
  }
  /** Später S-F (A): dasselbe Ergebnis mit dem anderen Wert als Ereignis; die Sterbetafel wird mit denselben Intervallen neu gerechnet (JavaScript), die Cox-Rechnungen mit R rechnet der Aufrufer neu. */
  function kaplanNeuMit(km: Kaplan, i: 0 | 1): Kaplan {
    const k2 = kaplanMit(km, i);
    if (km.sterbe) { const st = sterbetafelAusKaplan(k2, { breite: km.sterbe.breite, ende: km.sterbe.ende, einheit: km.sterbe.einheit }); if (!('fehler' in st)) k2.sterbe = st; }
    return k2;
  }
  /** Später S-F (A): die Intervalle der Sterbetafel im Ergebnis ändern - rechnet sofort neu (JavaScript) und schreibt die Wahl ins Blatt. Gibt den Satz zurück, wenn es nicht ging. */
  function sterbeNeu(o: { breite: string; ende: string; einheit: string }): string | null {
    const b = blatt, erg = b?.ergebnis as { typ?: string; e?: Kaplan } | null;
    if (!b || erg?.typ !== 'kaplanmeier' || !erg.e) return null;
    const st = sterbetafelAusKaplan(erg.e, { breite: zahlFeld(o.breite), ende: zahlFeld(o.ende), einheit: o.einheit });
    if ('fehler' in st) return sterbetafelFehlerSatz(st.fehler);
    b.ergebnis = { typ: 'kaplanmeier', e: { ...erg.e, sterbe: st } };
    uebSetze({ sterbe: { an: true, breite: o.breite, ende: o.ende, einheit: o.einheit } });
    b.zus = { ...kopiereZusatz(b.zus), ueberleben: kopiereUeberleben(zus.ueberleben) };
    sichern();
    melde(L('Die Sterbetafel ist neu gerechnet.', 'The life table has been recalculated.'));
    return null;
  }
  const kmVorschau = $derived(verfahren?.id === 'kaplanmeier' && fertigGewaehlt && new Set([werte.l1[0], werte.l2[0], werte.l3[0]].filter(Boolean)).size === [werte.l1[0], werte.l2[0], werte.l3[0]].filter(Boolean).length ? kaplanBerechne(werte, kmWahl) : null);
  /** Satz zum Ereignis-Wert: Vorschlag und Wahl getrennt (Abnahme 3, K1) - wurde umgeschaltet, steht dort, was vorgeschlagen war und warum, und was gewählt ist. */
  const kmVorschlagText = (k: Kaplan, vorschau: boolean) => {
    const vi = k.vorschlagIndex ?? k.ereignisIndex, gewaehlt = ereignisWort(k), vorg = k.werte[vi];
    if (!k.vorschlagGrund) return d(`Du hast „${gewaehlt}“ als Ereignis gewählt.`, `Sie haben „${gewaehlt}“ als Ereignis gewählt.`, `You chose "${gewaehlt}" as the event.`);
    if (vi === k.ereignisIndex) return vorschau ? L(`Statable schlägt „${gewaehlt}“ vor, ${kmGrundText(k.vorschlagGrund)}.`, `Statable suggests "${gewaehlt}", ${kmGrundText(k.vorschlagGrund)}.`) : L(`Statable hat „${gewaehlt}“ vorgeschlagen, ${kmGrundText(k.vorschlagGrund)}.`, `Statable suggested "${gewaehlt}", ${kmGrundText(k.vorschlagGrund)}.`);
    return d(`Statable hatte „${vorg}“ vorgeschlagen, ${kmGrundText(k.vorschlagGrund)}. Du hast „${gewaehlt}“ gewählt.`, `Statable hatte „${vorg}“ vorgeschlagen, ${kmGrundText(k.vorschlagGrund)}. Sie haben „${gewaehlt}“ gewählt.`, `Statable had suggested "${vorg}", ${kmGrundText(k.vorschlagGrund)}. You chose "${gewaehlt}".`);
  };
  /** Nur ein Wert in der Ereignisspalte, gelesen als Ereignis: was das heißt (und dass es bei Text ohne Hinweis geraten ist). */
  const kmEinWertText = (k: Kaplan) => {
    const w = k.werte[1], grund = einWertArt({ schluessel: w, text: w }).grund;
    const geraten = grund === 'text' ? L(` Statable liest „${w}“ als Ereignis, weil die Bezeichnung nichts anderes sagt. Steht „${w}“ für zensiert, gibt es keine Kurve.`, ` Statable reads "${w}" as the event because the label says nothing else. If "${w}" means censored, there is no curve.`) : '';
    return L(`${name(k.ereignis)} hat nur den Wert „${w}“: Alle hatten das Ereignis, niemand ist zensiert. Die Kurve zeigt dann den Anteil, der zu jeder Zeit noch ohne Ereignis ist.${geraten}`, `${name(k.ereignis)} has only the value "${w}": everyone had the event, nobody is censored. The curve then shows the proportion still without the event at each time.${geraten}`);
  };
  /** Warum Statable dieses Ereignis vorschlägt. */
  const kmGrundText = (g: string) => g === 'bezeichnung' ? L('nach der Bezeichnung des Werts', 'judging by the label of the value') : g === 'null-eins' ? L('weil 1 üblicherweise „Ereignis eingetreten“ bedeutet (0/1)', 'because 1 usually means "event occurred" (0/1)') : g === 'eins-zwei' ? L('weil 2 in R survival „Ereignis“ bedeutet (1 = zensiert, 2 = Ereignis)', 'because 2 means "event" in R survival (1 = censored, 2 = event)') : g === 'zahl' ? L('weil der größere Wert als Ereignis zählt', 'because the larger value counts as the event') : g === 'reihenfolge' ? L('weil der später sortierte Wert als Ereignis zählt', 'because the value that sorts later counts as the event') : d('von dir gewählt', 'von Ihnen gewählt', 'chosen by you');

  /* ---------- Hinweis: die Daten sind in Gruppen eingeteilt ---------- */
  /** Gibt es eine Gruppierungsspalte (Klasse, Seminar, Kennung mit Wiederholungen)? Dann bietet Statable die Mehrebenen-Frage an, schon ausgefüllt.
   *  Gilt für „Unterscheiden sich Gruppen?“ und „Lässt sich etwas vorhersagen?“ (nicht bei zwei Werten als Ziel: logistische Regression). */
  function ebenenFuer(art: string, w: Werte) {
    if (art !== 'gruppen' && art !== 'vorhersage') return null;
    if (!w.l1[0] || !w.l2.length || (art === 'vorhersage' && ctx.verschieden(w.l1[0]) === 2)) return null;
    const v = erkenneGruppierung(s.spalten, s.zeilen, [...w.l1, ...w.l2]);
    if (!v) return null;
    return { v, vorschlag: art === 'gruppen' ? { l1: [w.l1[0]], l2: [v.spalte], l3: [w.l2[0]!], l4: [] } as Werte : { l1: [w.l1[0]], l2: [v.spalte], l3: [...w.l2], l4: [] } as Werte };
  }
  const ebenenPruefliste = $derived(verfahren && fertigGewaehlt ? ebenenFuer(verfahren.id, werte) : null);

  /* ---------- Prüfliste ---------- */
  interface Punkt { art: 'ok' | 'hinweis' | 'info' | 'sperre'; /** Knopf „Fallgewicht angeben/ändern“ (öffnet den Dialog) */ gewicht?: boolean; text: string; klein?: string; fund?: string; knopf?: string; /** Knopf „Ordinal rechnen“ / „Als Zähldaten rechnen“: wählt dieses Modell (nie still) */ modell?: 'ordinal' | 'zaehl'; erklaer?: string; /** Knopf „Mit Mehrebenenmodell rechnen“: die vorbefüllte Frage */ ebenen?: Werte }
  /** Prüfliste der Regression: Gruppen-Spalten als Vergleiche mit der ersten Gruppe; zu viele Stufen und geordnete Spalten gehen als Zahl ein (Abschlusstest F1, regfaktor.ts). */
  function gruppenPruefliste(praed: string[]): Punkt[] {
    return praed.flatMap((n): Punkt[] => {
      const sp = spalteNach(n); if (!sp) return [];
      const f = ctx.faktor?.(n) ?? null, k = ctx.verschieden(n);
      if (f) return [{ art: 'info', text: L(`${name(n)}: ${f.stufen.length} Gruppen, Vergleichsgruppe „${f.stufen[0]!.name}“`, `${name(n)}: ${f.stufen.length} groups, reference group "${f.stufen[0]!.name}"`),
        klein: L('Gruppen gehen nicht als Zahl ein, sondern als Vergleiche mit der ersten Gruppe (0/1-Hilfsspalten, Dummy-Kodierung). Das Ergebnis nennt die Unterschiede gegenüber dieser Gruppe und prüft die Spalte als Ganzes.', 'Groups do not enter as a number but as comparisons with the first group (0/1 helper columns, dummy coding). The result states the differences from this group and tests the column as a whole.'), erklaer: 'regression' }];
      if (zuVieleStufen(sp, k)) return [{ art: 'hinweis', text: L(`${name(n)}: ${k} verschiedene Werte - zu viele für Gruppen, geht als Zahl ein`, `${name(n)}: ${k} distinct values - too many for groups, enters as a number`),
        klein: L('Die Spalte hat Wertebeschriftungen oder das Niveau „nominal“, beschreibt also Gruppen. Mehr als 12 Gruppen rechnet Statable nicht als Gruppen. Als Zahl ist das nur sinnvoll, wenn die Werte eine Menge oder ein Maß sind; sonst Gruppen zusammenfassen oder die Spalte weglassen.', 'The column has value labels or the level "nominal", so it describes groups. Statable does not calculate more than 12 groups as groups. As a number this only makes sense if the values are an amount or a measure; otherwise merge groups or leave the column out.'), erklaer: 'regression' }];
      if (ordinalAlsZahl(sp)) return [{ art: 'info', text: L(`${name(n)} ist geordnet (ordinal) und geht als Zahl ein`, `${name(n)} is ordered (ordinal) and enters as a number`),
        klein: L('Statable nimmt dann gleiche Abstände zwischen den Stufen an. Sollen die Stufen als Gruppen zählen, das Niveau unter „Spalten beschreiben“ auf „nominal“ stellen.', 'Statable then assumes equal distances between the levels. If the levels should count as groups, set the level to "nominal" under "Describe columns".'), erklaer: 'regression' }];
      return [];
    });
  }
  /** Prüfliste der zweiten Gruppierung (leere Zellen, Zellgrößen) und der Kontrollvariable (Gruppengrößen, Voraussetzung). Beides zugleich rechnet Statable nicht. */
  function gruppen2Pruefliste(): Punkt[] {
    const [y, g] = [werte.l1[0]!, werte.l2[0]!], b = werte.l3[0], xs = werte.l4, x = xs[0];
    if (b && x) return [{ art: 'sperre', text: L('Zweite Gruppierung und Kontrollvariable zugleich rechnet Statable nicht', 'Statable does not calculate a second grouping and a control variable together'),
      klein: d('Die zweifaktorielle Kovarianzanalyse ist nicht eingebaut. Nimm die zweite Gruppierung oder die Kontrollvariable aus der Frage heraus.', 'Die zweifaktorielle Kovarianzanalyse ist nicht eingebaut. Nehmen Sie die zweite Gruppierung oder die Kontrollvariable aus der Frage heraus.', 'The two-way analysis of covariance is not built in. Remove either the second grouping or the control variable from the question.') }];
    const p: Punkt[] = [];
    const alleSp = [y, g, ...(b ? [b] : xs)], mehrfach = new Set(alleSp).size < alleSp.length;
    if (mehrfach) return [{ art: 'sperre', text: L('Eine Spalte steht mehrfach', 'A column is used more than once'), klein: L('Messwert, Gruppierung und zweite Gruppierung bzw. Kontrollvariable müssen verschiedene Spalten sein.', 'The measure, the grouping and the second grouping or control variable must be different columns.') }];
    const voll = vollstaendig(alleSp), n = voll.length, aus = s.zeilen.length - n;
    const ausText = aus > 0 ? ' ' + Lp(aus, `${aus} Zeile mit einer Lücke wird ausgelassen.`, `${aus} Zeilen mit Lücken werden ausgelassen.`, `${aus} row with a gap is left out.`, `${aus} rows with gaps are left out.`) : '';
    if (b) {
      const zaehl = new Map<string, number>(), aS = [...new Set(voll.map(z => z[1]!))], bS = [...new Set(voll.map(z => z[2]!))];
      for (const z of voll) zaehl.set(`${z[1]}\u0000${z[2]}`, (zaehl.get(`${z[1]}\u0000${z[2]}`) ?? 0) + 1);
      if (aS.length < 2 || bS.length < 2) return [{ art: 'sperre', text: L('Eine Gruppierung hat nur eine Stufe', 'One grouping has only one level'), klein: L('Nach dem Aussortieren von Lücken bleibt in einer der beiden Gruppierungen nur eine Gruppe - so lässt sich nichts vergleichen.', 'After leaving out gaps, only one group remains in one of the two groupings - so nothing can be compared.') }];
      const leere = aS.flatMap(a => bS.filter(bb => !zaehl.has(`${a}\u0000${bb}`)).map(bb => `${stufenName(g, a)} / ${stufenName(b, bb)}`));
      const leereListe = leere.slice(0, 6).join(', ') + (leere.length > 6 ? ' …' : '');
      if (leere.length) p.push({ art: 'sperre', text: Lp(leere.length, `Eine Zelle ist leer: ${leereListe}`, `${leere.length} Zellen sind leer: ${leereListe}`, `One cell is empty: ${leereListe}`, `${leere.length} cells are empty: ${leereListe}`),
        klein: d('In dieser Kombination aus beiden Gruppierungen gibt es keine Person mit allen Angaben. Dann lässt sich die Wechselwirkung nicht schätzen, und es gibt kein Ergebnis. Fasse Stufen zusammen oder wähle eine andere Gruppierung.', 'In dieser Kombination aus beiden Gruppierungen gibt es keine Person mit allen Angaben. Dann lässt sich die Wechselwirkung nicht schätzen, und es gibt kein Ergebnis. Fassen Sie Stufen zusammen oder wählen Sie eine andere Gruppierung.', 'In this combination of the two groupings there is no person with all answers. The interaction cannot be estimated then, and there is no result. Merge levels or choose another grouping.'), erklaer: 'voraussetzung' });
      else if (n - aS.length * bS.length < 1) p.push({ art: 'sperre', text: L(`Zu wenige Personen: ${n} in ${aS.length * bS.length} Zellen`, `Not enough people: ${n} in ${aS.length * bS.length} cells`), klein: L('Es muss mindestens eine Person mehr geben als Zellen; sonst bleibt kein Fehlerterm.', 'There must be at least one more person than cells; otherwise no error term remains.') });
      const gr = [...zaehl.values()], kl = gr.length ? Math.min(kleinste(gr)) : 0, gro = gr.length ? Math.max(groesste(gr)) : 0;
      p.unshift({ art: 'ok', text: L(`${aS.length} × ${bS.length} Zellen, ${n} Personen mit allen drei Angaben`, `${aS.length} × ${bS.length} cells, ${n} people with all three answers`), klein: L(`Personen je Zelle: kleinste ${kl}, größte ${gro}.`, `People per cell: smallest ${kl}, largest ${gro}.`) + ausText });
      if (!leere.length && kl < 10) p.push({ art: 'hinweis', text: L(`Eine Zelle ist klein (${kl} Personen)`, `One cell is small (${kl} people)`), klein: L('Mit wenigen Personen je Zelle ist das Ergebnis unsicherer, besonders die Prüfung der Wechselwirkung.', 'With few people per cell the result is less certain, especially the test of the interaction.'), erklaer: 'stichprobe' });
      if (!leere.length && kl !== gro) p.push({ art: 'info', text: L('Die Zellen sind unterschiedlich groß', 'The cells differ in size'), klein: L('Statable rechnet mit Quadratsummen vom Typ III (wie SPSS): Jeder Effekt wird um die anderen bereinigt. Das gilt auch bei ungleichen Zellgrößen.', 'Statable uses Type III sums of squares (as in SPSS): each effect is adjusted for the others. This also holds with unequal cell sizes.') });
      p.push({ art: 'info', text: L('Statable deutet die Wechselwirkung zuerst', 'Statable interprets the interaction first'), klein: L('Ist sie bedeutsam, zeigt Statable einfache Effekte mit Holm-Korrektur und deutet die Haupteffekte nur mit Vorsicht.', 'If it is significant, Statable shows simple effects with Holm adjustment and interprets the main effects only with caution.') });
      return p;
    }
    const zaehl = new Map<string | number, number>(); for (const z of voll) zaehl.set(z[1]!, (zaehl.get(z[1]!) ?? 0) + 1);
    const k = zaehl.size, klein = [...zaehl].filter(([, m]) => m < 2);
    if (k < 2) return [{ art: 'sperre', text: L('Es bleibt nur eine Gruppe', 'Only one group remains'), klein: L('Nach dem Aussortieren von Lücken gibt es keinen Vergleich zwischen Gruppen.', 'After leaving out gaps there is no comparison between groups.') }];
    xs.forEach((xn, i) => { if (new Set(voll.map(z => z[2 + i])).size < 2) p.push({ art: 'sperre', text: L(`${name(xn)}: alle haben denselben Wert`, `${name(xn)}: everyone has the same value`), klein: L('Eine Kontrollvariable ohne Unterschiede kann nichts herausrechnen.', 'A control variable without differences cannot control for anything.') }); });
    if (klein.length) p.push({ art: 'sperre', text: Lp(klein.length, `Eine Gruppe hat nur 1 Person: ${klein.map(([kk]) => stufenName(g, kk)).join(', ')}`, `Gruppen haben nur 1 Person: ${klein.map(([kk]) => stufenName(g, kk)).join(', ')}`, `One group has only 1 person: ${klein.map(([kk]) => stufenName(g, kk)).join(', ')}`, `Some groups have only 1 person: ${klein.map(([kk]) => stufenName(g, kk)).join(', ')}`), klein: L('Für den Test der Steigungen braucht jede Gruppe mindestens zwei Personen.', 'For the test of the slopes every group needs at least two people.') });
    else if (n - 2 * k < 1) p.push({ art: 'sperre', text: L(`Zu wenige Personen: ${n} in ${k} Gruppen`, `Not enough people: ${n} in ${k} groups`), klein: L('Für das Modell mit eigenen Steigungen je Gruppe müssen es mehr Personen sein als doppelt so viele wie Gruppen.', 'For the model with separate slopes per group there must be more people than twice the number of groups.') });
    p.unshift({ art: n >= 30 ? 'ok' : 'hinweis', text: L(`${n} Personen mit allen drei Angaben in ${k} Gruppen`, `${n} people with all three answers in ${k} groups`), klein: `${[...zaehl].map(([kk, m]) => `${stufenName(g, kk)}: ${m}`).join(' · ')}.${ausText}` });
    p.push({ art: 'info', text: L('Kann Statable nicht prüfen: Wurde die Kontrollvariable vor der Maßnahme erhoben, und beeinflusst die Gruppe sie nicht?', 'Statable cannot check this: was the control variable measured before the intervention, and does the group not influence it?'),
      klein: L('Sonst rechnet die Kovarianzanalyse einen Teil der Wirkung der Gruppe heraus. Ein Beispiel für eine geeignete Kontrollvariable ist das Vorwissen vor der Maßnahme.', 'Otherwise the analysis of covariance removes part of the effect of the group. An example of a suitable control variable is prior knowledge before the intervention.'), erklaer: 'voraussetzung' });
    p.push({ art: 'info', text: L('Statable prüft, ob die Kontrollvariable in allen Gruppen gleich wirkt', 'Statable checks whether the control variable acts equally in all groups'), klein: L('Das Ergebnis zeigt den Test der Steigungen (Gruppe × Kontrollvariable). Ist er signifikant, sind die adjustierten Mittelwerte nur bedingt deutbar.', 'The result shows the test of the slopes (group × control variable). If it is significant, the adjusted means can be interpreted only to a limited extent.') });
    return p;
  }
  /* ---------- Weitere Wege: Äquivalenztest (G15) und Reliable Change Index (G16) ---------- */
  /** TOST: genau zwei Gruppen (ohne zweite Gruppierung und Kontrollvariable) oder zwei Messungen derselben Personen. */
  const tostMoeglich = $derived((verfahren?.id === 'praepost' && !jaNeinFall(verfahren, werte)) || (verfahren?.id === 'gruppen' && !werte.l3.length && !werte.l4.length && !!werte.l2[0] && ctx.verschieden(werte.l2[0]) === 2));
  /** Welle 7, M1: Spalten für die Cox-Regression gewählt (Kaplan-Meier-Karte, Lücke l4 unter „Weitere Wege“)? Dann rechnet R (survival). */
  const coxAn = $derived(verfahren?.id === 'kaplanmeier' && werte.l4.length > 0);
  /* ---------- Später S-F (A): Sterbetafel und Cox mit zeitabhängiger Größe unter „Weitere Wege“ der Karte Kaplan-Meier ---------- */
  const ueb = $derived(kopiereUeberleben(zus.ueberleben));
  function uebSetze(neu: Partial<UeberlebenWahl>) { zus.ueberleben = { ...kopiereUeberleben(zus.ueberleben), ...neu }; }
  const sterbeAn = $derived(verfahren?.id === 'kaplanmeier' && ueb.sterbe.an);
  /** Die Wahl „Eine Angabe ändert sich im Lauf der Zeit“ gilt nur mit gewählten Spalten für die Cox-Regression. */
  const coxZeitAn = $derived(verfahren?.id === 'kaplanmeier' && ueb.zeit.an && coxAn);
  /** Später S-F2: AFT-Modell (Zeitverhältnis) neben der Cox-Regression - braucht Spalten für die Cox-Regression, keine zeitabhängige Größe. */
  const aftAn = $derived(verfahren?.id === 'kaplanmeier' && ueb.aft.an && coxAn && !coxZeitAn);
  /** Später S-F2: Cox-Regression mit Kennung (Cluster oder Frailty) - braucht die Kennungsspalte, keine zeitabhängige Größe. */
  const frailtyAn = $derived(verfahren?.id === 'kaplanmeier' && ueb.kennung.art !== 'aus' && !!ueb.kennung.spalte && coxAn && !coxZeitAn);
  /** Die Spalten der Tabelle in Intervall-Form (Start, Kennung, zeitabhängige Größe aus der Wahl; Ende und Ereignis aus den Lücken oben). */
  const kzSpalten = $derived<ZeitSpalten>({ kennung: ueb.zeit.kennung, start: ueb.zeit.start, stopp: werte.l1[0] ?? '', ereignis: werte.l2[0] ?? '', wert: ueb.zeit.wert, fest: werte.l4.filter(n => n !== ueb.zeit.wert) });
  /** Schlägt Start, Kennung und Größe vor, wenn die Wahl eingeschaltet wird (die Person ändert sie). */
  function zeitVorschlag() { const v = schlageZeitSpaltenVor(s.spalten, werte.l1[0] ?? '', werte.l2[0] ?? '', werte.l4); uebSetze({ zeit: { an: true, start: ueb.zeit.start || v.start, kennung: ueb.zeit.kennung || v.kennung, wert: ueb.zeit.wert && werte.l4.includes(ueb.zeit.wert) ? ueb.zeit.wert : v.wert } }); }
  /** Die vorgeschlagene Breite der Intervalle (etwa zehn), als Hilfetext im Eingabefeld. */
  const sterbeVorgabe = $derived.by(() => { if (!sterbeAn || !kmVorschau) return null; const a = intervallAnfaenge(kmVorschau.roh.map(r => r[1])); return a.ok ? a : null; });
  const clusterAn = $derived(verfahren?.id === 'cluster');   // Später S-E: Ward und k-Means rechnet R (Basispaket stats)
  /** Später S-D2 (Bauer A2): Karte Verteilung oder Kreuztabelle mit Umfragegewicht und der Antwort „Personen einzeln gezogen: Ja“ - dann rechnet R (survey) Standardfehler, Intervalle und Test zu den gewichteten Zahlen. */
  const umfrageAn = $derived(!!verfahren && (verfahren.id === 'verteilung' || verfahren.id === 'kreuz') && klumpenfreiFuer(verfahren.id, aktivesGewicht()) === true);
  /** Später S-D2 (Bauer B): Umfragegewicht mit „Personen einzeln gezogen: Ja“ beim Gruppenvergleich (ohne zweite Gruppierung/Kontrollvariable) oder bei der einfachen Regression (ohne Blöcke, ohne ordinales/multinomiales/Zähl-Modell):
   *  dann rechnen Standardfehler, Intervalle und Tests designbasiert mit R (survey). */
  const designBAn = $derived.by(() => {
    if (!verfahren || (verfahren.id !== 'gruppen' && verfahren.id !== 'vorhersage')) return false;
    const g = aktivesGewicht();
    if (!g || !nutztDesign(g) || !DESIGN_ANGEBUNDEN[verfahren.id]) return false;
    return verfahren.id === 'gruppen' ? !werte.l3.length && !werte.l4.length : katArt === null && kursArt === null && !zusEff.hier.an;
  });
  /** Welle 7, M2: Kreuztabelle 2 × 2 (beide Spalten mit genau zwei Werten): Studiendesign wählbar, Risikomaße im Ergebnis. */
  const risikoMoeglich = $derived(verfahren?.id === 'kreuz' && !!werte.l1[0] && !!werte.l2[0] && !istSetName(werte.l1[0]) && ctx.verschieden(werte.l1[0]) === 2 && ctx.verschieden(werte.l2[0]) === 2);
  /** Später S-B (M5, M3): Kreuztabelle mit zwei gewählten Spalten (kein Mehrfachantworten-Set): „Stärke des Zusammenhangs“ und „Nach dritter Spalte aufteilen“ unter „Weitere Wege“. */
  const kreuzWegeMoeglich = $derived(verfahren?.id === 'kreuz' && !!werte.l1[0] && !!werte.l2[0] && !istSetName(werte.l1[0]) && !istSetName(werte.l2[0]));
  /** Messniveau einer Spalte für die Wahl der Maße (Fachblatt S-B 1.2): ordinal nur bei ordinalem Niveau; Zahlen-Skala mit wenigen Werten zählt als geordnet. */
  const masseArtVon = (n: string): SpaltenArt => { const sp = spalteNach(n); return sp?.niveau === 'ordinal' ? 'ordinal' : sp?.niveau === 'nominal' || sp?.art === 'text' ? 'nominal' : ctx.verschieden(n) > 12 ? 'zahl' : Object.keys(sp?.werteLabels ?? {}).length ? 'ordinal' : 'zahl'; };
  const schichtKandidaten = $derived(kreuzWegeMoeglich ? s.spalten.filter(sp => sp.art !== 'datum' && sp.name !== werte.l1[0] && sp.name !== werte.l2[0] && !kennung(sp) && !istSetName(sp.name) && ctx.verschieden(sp.name) >= 2 && ctx.verschieden(sp.name) <= MH_MAX_SCHICHTEN).map(sp => ({ name: sp.name, label: lesbar(sp, true), stufen: ctx.verschieden(sp.name) })) : []);
  const rciMoeglich = $derived(verfahren?.id === 'praepost' && !jaNeinFall(verfahren, werte));   // bei zwei Ja/Nein-Spalten (McNemar) gibt es weder Äquivalenztest noch RCI
  /** Die Wahl, soweit sie zur Frage passt (ein Haken, der bei anderer Spaltenwahl nicht mehr gilt, zählt nicht). */
  /** Blöcke bilden (G4): lineare Regression (Ziel nicht mit zwei Werten) mit mindestens zwei Spalten unter „Woraus?“. */
  const hierMoeglich = $derived(verfahren?.id === 'vorhersage' && !!werte.l1[0] && ctx.verschieden(werte.l1[0]) !== 2 && werte.l2.length >= 2);

  /** Welle S-B, L5: „Ohne Normalverteilung - mit Zufallsverfahren“ unter „Weitere Wege“ - zwei Gruppen (ohne zweite Gruppierung, ohne Kontrollvariable), Zusammenhang zweier Spalten (Pearson), lineare Regression, Zahlenspalten der Verteilung. */
  const zufallGrund = $derived.by((): Parameters<typeof zufallGrundText>[0] | null => {
    const v = verfahren?.id;
    if (v === 'gruppen') return werte.l3.length || werte.l4.length || !werte.l2[0] || ctx.verschieden(werte.l2[0]) !== 2 ? 'mehrere-gruppen' : null;
    if (v === 'zusammenhang') return werte.l3.length ? 'rangkorr' : null;
    if (v === 'vorhersage') return !werte.l1[0] ? 'wenig' : katArt !== null || vorhArt !== null || ctx.verschieden(werte.l1[0]) === 2 ? 'katmodell' : zus.hier.an && hierMoeglich ? 'hier' : null;
    if (v === 'verteilung') return werte.l1.some(n => !istSetName(n) && ctx.istZahl(n)) ? null : 'keine-zahlen';
    return 'wenig';
  });
  const zufallMoeglich = $derived(!!verfahren && ['gruppen', 'zusammenhang', 'vorhersage', 'verteilung'].includes(verfahren.id) && !(verfahren.id === 'gruppen' && !!jaNeinFall(verfahren, werte)));
  /** Die Eingabefelder für B und Startwert als Text (erst gültig, wenn sie eine ganze Zahl in den Grenzen sind). */
  let zufallText = $state({ B: '9999', start: '20261008' });
  const zufallBText = $derived(ganzeZahlAusText(zufallText.B)), zufallStartText = $derived(ganzeZahlAusText(zufallText.start));
  const zufallEingabeOk = $derived(!zus.zufall?.an || (zufallBText !== null && bGueltig(zufallBText) && zufallStartText !== null && zufallStartText <= 4294967295));
  function zufallSetzen(neu: Partial<ZufallWahl>) { zus.zufall = { ...kopiereZufall(zus.zufall ?? leereZufall()), ...neu }; zufallText = { B: String(zus.zufall.B), start: String(zus.zufall.startwert) }; }
  function zufallEingabe(feld: 'B' | 'start', text: string) {
    zufallText = { ...zufallText, [feld]: text };
    const v = ganzeZahlAusText(text);
    if (v === null) return;
    if (feld === 'B' && bGueltig(v)) zus.zufall = { ...kopiereZufall(zus.zufall ?? leereZufall()), an: true, B: v };
    if (feld === 'start' && v <= 4294967295) zus.zufall = { ...kopiereZufall(zus.zufall ?? leereZufall()), an: true, startwert: v };
  }
  $effect(() => { const z = zus.zufall; if (!z) return; untrack(() => { if (zufallBText !== z.B || zufallStartText !== z.startwert) zufallText = { B: String(z.B), start: String(z.startwert) }; }); });
  /** „Neu ziehen“ im Ergebnis: neuer Startwert in der Wahl; ohne „Sofort rechnen“ rechnet der Knopf von selbst neu. */
  function neuerStartwert(startwert: number) { zufallSetzen({ an: true, startwert }); if (!vonSelbst) void neuRechnen(); }
  /* ---------- Welle 3: Modell der Regression (linear, ordinal, Zähldaten, multinomial; Wahl unter „Weitere Wege“, Standard je nach Zielspalte, kategwahl.ts) ---------- */
  const zielSpalte = $derived(verfahren?.id === 'vorhersage' && werte.l1[0] ? spalteNach(werte.l1[0]) ?? null : null);
  const zielZahlen = $derived(zielSpalte && zielSpalte.art === 'zahl' ? gueltigeWerte(zielSpalte.name).filter((v): v is number => typeof v === 'number') : []);
  const modellPassend = $derived<ModellArt[]>(zielSpalte ? [...(zielArt(zielSpalte, ctx.verschieden(zielSpalte.name)) === 'binaer' ? (['linear'] as ModellArt[]) : []), ...modelleFuer(zielSpalte, ctx.verschieden(zielSpalte.name), zielZahlen), ...zusatzModelle(zielSpalte, ctx.verschieden(zielSpalte.name), zielZahlen), ...kursModelle(zielSpalte, ctx.verschieden(zielSpalte.name))] : []);   // Kurs-Paket: bei zwei Werten Logit (Standard) oder Probit, bei einer Zahl dazu die Präzisionsgewichte   // Später S-E: dazu Quantilregression und Strafregression
  const modellArtEff = $derived<ModellArt>(modellGilt(zus.modell, modellPassend));
  const katArt = $derived<KatArt | null>(zielSpalte && modellArtEff !== 'linear' && modellArtEff !== 'quantil' && modellArtEff !== 'penal' && modellArtEff !== 'probit' && modellArtEff !== 'wls' && modellArtEff !== 'nls' ? (modellArtEff === 'ordinal' ? 'ordreg' : modellArtEff === 'multi' ? 'multreg' : 'zaehlreg') : null);
  /** Später S-E: Quantilregression (quantreg) oder Strafregression (glmnet) gewählt und passend zum Ziel. */
  const vorhArt = $derived<'quantil' | 'penal' | null>(zielSpalte && (modellArtEff === 'quantil' || modellArtEff === 'penal') ? modellArtEff : null);
  /** Kurs-Paket: Probit (Ja/Nein-Ziel) oder gewichtete Regression mit Präzisionsgewichten (Zahl-Ziel) gewählt; R rechnet (nur stats). */
  const kursArt = $derived<'probit' | 'wls' | 'nls' | null>(zielSpalte && (modellArtEff === 'probit' || modellArtEff === 'wls' || modellArtEff === 'nls') ? modellArtEff : null);
  /** Abschnitt 5: die gewählte feste Formel der nichtlinearen Regression (leer = noch nicht gewählt). */
  const nlsFormel = $derived<NlsArt | ''>(istNlsArt(zus.modell.formel) ? zus.modell.formel : '');
  const zielBinaer = $derived(!!zielSpalte && zielArt(zielSpalte, ctx.verschieden(zielSpalte.name)) === 'binaer');
  /** Kurs-Paket: die Karten Diskriminanzanalyse, loglineare Modelle und MANOVA (R rechnet). */
  const kpKarte = $derived<'diskriminanz' | 'loglinear' | 'manova' | 'armut' | null>(verfahren?.id === 'diskriminanz' || verfahren?.id === 'loglinear' || verfahren?.id === 'manova' || verfahren?.id === 'armut' ? verfahren.id : null);
  const vorhEff = $derived(kopiereVorh(zus.vorh));
  const katStufen = $derived(katArt && katArt !== 'zaehlreg' && fertigGewaehlt ? katFaelle(katArt, werte.l1[0]!, werte.l2, s.zeilen, s.spalten).stufen : []);
  const modellEffWahl = $derived<ModellWahl>({ art: modellArtEff, zaehl: zus.modell.zaehl, zeit: katArt === 'zaehlreg' || modellArtEff === 'wls' ? zus.modell.zeit : '', referenz: katArt === 'multreg' ? referenzGilt(zus.modell, stufenMitFaellen(katStufen)) : '', ...(modellArtEff === 'nls' && nlsFormel ? { formel: nlsFormel } : {}) });
  const zusEff = $derived<ZusatzWahl>({ tost: { ...zus.tost, an: zus.tost.an && tostMoeglich }, rci: { ...zus.rci, an: zus.rci.an && rciMoeglich }, hier: { an: zus.hier.an && hierMoeglich, anzahl: zus.hier.anzahl, block: { ...zus.hier.block } }, modell: modellEffWahl, ...(vorhArt ? { vorh: vorhEff } : {}), cox: { an: coxAn }, design: risikoMoeglich && zus.design === 'fallKontrolle' ? 'fallKontrolle' : 'kohorte', bootArt: verfahren?.id === 'mediation' && zus.bootArt === 'bca' ? 'bca' : 'perzentil', masse: { an: kreuzWegeMoeglich && !!zus.masse?.an, arten: kreuzWegeMoeglich && zus.masse?.an ? [...zus.masse.arten] : [] }, schicht: kreuzWegeMoeglich && schichtKandidaten.some(k => k.name === zus.schicht) ? zus.schicht ?? '' : '', ...(kreuzWegeMoeglich && zus.prozent ? { prozent: [...zus.prozent] } : {}), ...(zus.zufall?.an && zufallMoeglich && zufallGrund === null ? { zufall: kopiereZufall(zus.zufall) } : {}), ...(verfahren?.id === 'mediation' && prozessAn(zus.prozess) && werte.l4[0] ? { prozess: kopiereProzess(zus.prozess) } : {}), ...(verfahren?.id === 'kaplanmeier' && ueberlebenAn(zus.ueberleben) ? { ueberleben: { sterbe: { ...ueb.sterbe }, zeit: { ...ueb.zeit, an: coxZeitAn }, aft: { ...ueb.aft, an: aftAn }, kennung: { ...ueb.kennung, art: frailtyAn ? ueb.kennung.art : 'aus' } } } : {}), ...(verfahren?.id === 'verteilung' && umfrageAn && umfrageWahlAn(zus.umfrage) ? { umfrage: { test: !!zus.umfrage?.test, wert: zus.umfrage?.wert ?? '', anteil: zus.umfrage?.anteil === 'beta' ? 'beta' as const : 'logit' as const } } : {}) });
  /* ---------- Später S-D, G14: bedingte und serielle Mediation (PROCESS 7, 14, 6) unter „Weitere Wege“ der Karte Mediation ---------- */
  /** Das gewählte Modell (4 = einfache Mediation); die vierte Spalte `werte.l4` ist der Moderator W (7, 14) oder der zweite Zwischenschritt M2 (6). */
  const prozessModell = $derived<4 | ProzessModellNr>(verfahren?.id === 'mediation' ? (kopiereProzess(zus.prozess).modell as 4 | ProzessModellNr) : 4);
  /** Die vollständigen Fälle der vier Spalten (x m y v) als Daten des Modells. */
  function prozessDatenAus(modell: ProzessModellNr, w: Werte): { daten: ProzessDaten; n: number } {
    const voll = vollstaendig([w.l1[0]!, w.l3[0]!, w.l2[0]!, w.l4[0]!]), sp = (k: number) => voll.map(z => z[k] as number);
    return { daten: modell === 6 ? { x: sp(0), m: sp(1), y: sp(2), m2: sp(3) } : { x: sp(0), m: sp(1), y: sp(2), w: sp(3) }, n: voll.length };
  }
  const prozessEigen = $derived(kopiereProzess(zus.prozess).regel === 'eigen' ? eigeneWerte(kopiereProzess(zus.prozess).eigen) : []);
  /** Die W-Werte, bei denen gerechnet würde (Vorschau und Rechnung); `null`, solange die Wahl nicht vollständig ist. */
  const prozessWInfo = $derived.by(() => {
    if (verfahren?.id !== 'mediation' || (prozessModell !== 7 && prozessModell !== 14) || !werte.l1[0] || !werte.l2[0] || !werte.l3[0] || !werte.l4[0] || prozessEigen === null) return null;
    const dt = prozessDatenAus(prozessModell, werte);
    return dt.n >= 2 && dt.daten.w ? moderatorWerteWahl(dt.daten.w, kopiereProzess(zus.prozess).regel, prozessEigen) : null;
  });
  let prozessAbbruch = false;
  function prozessPunkte(): Punkt[] {
    const modell = prozessModell as ProzessModellNr, [x, y, m, v] = [werte.l1[0]!, werte.l2[0]!, werte.l3[0], werte.l4[0]], p: Punkt[] = [];
    if (!v) { p.push({ art: 'sperre', text: modell === 6 ? L('Der zweite Zwischenschritt fehlt', 'The second intermediate step is missing') : L('Der Moderator fehlt', 'The moderator is missing'), klein: d('Wähle unter „Weitere Wege“ die vierte Größe oder schalte zurück auf die einfache Mediation.', 'Wählen Sie unter „Weitere Wege“ die vierte Größe oder schalten Sie zurück auf die einfache Mediation.', 'Choose the fourth variable under "More options" or switch back to the simple mediation.') }); return p; }
    if (new Set([x, y, m, v]).size < 4) { p.push({ art: 'sperre', text: L('Eine Spalte steht mehrfach', 'A column is used more than once'), klein: d('Wähle für die vier Lücken vier verschiedene Spalten.', 'Wählen Sie für die vier Lücken vier verschiedene Spalten.', 'Choose four different columns for the four blanks.') }); return p; }
    const dt = prozessDatenAus(modell, werte), n = dt.n, aus = s.zeilen.length - n, pr = prozessPruefung(modell, dt.daten);
    const spaltenNamen: [string, number[] | undefined][] = [[x, dt.daten.x], [m!, dt.daten.m], [y, dt.daten.y], [v, modell === 6 ? dt.daten.m2 : dt.daten.w]];
    if (pr.fehler === 'n-zu-klein') { p.push({ art: 'sperre', text: L(`Zu wenige Personen: ${n} mit allen vier Angaben, nötig sind mindestens 10`, `Not enough people: ${n} with all four answers, at least 10 needed`), klein: L('Mit so wenigen Personen lässt sich das nicht sinnvoll rechnen.', 'With so few people this cannot be calculated meaningfully.') }); return p; }
    const konst = spaltenNamen.filter(([, a]) => a && new Set(a).size < 2).map(([nm]) => nm);
    if (konst.length) { p.push({ art: 'sperre', text: L(`${konst.map(name).join(', ')}: alle haben denselben Wert`, `${konst.map(name).join(', ')}: everyone has the same value`), klein: L('Ohne Unterschiede zwischen den Personen lässt sich nichts berechnen.', 'Without differences between people nothing can be calculated.') }); return p; }
    const zwei = [[m!, dt.daten.m], [y, dt.daten.y], ...(modell === 6 ? [[v, dt.daten.m2]] : [])].filter(([, a]) => new Set(a as number[]).size === 2).map(([nm]) => nm as string);
    if (zwei.length) { p.push({ art: 'sperre', text: L(`${zwei.map(name).join(', ')}: nur zwei Werte`, `${zwei.map(name).join(', ')}: only two values`), klein: L('Ein Zwischenschritt oder eine Zielgröße mit nur zwei Werten (zum Beispiel 0 und 1) braucht eine logistische Regression; das rechnet diese Karte nicht. Nur X darf zwei Werte haben.', 'An intermediate step or an outcome with only two values (for example 0 and 1) needs a logistic regression; this card does not calculate that. Only X may have two values.') }); return p; }
    if (modell !== 6 && prozessEigen === null) p.push({ art: 'sperre', text: L('Die eigenen Werte von W lassen sich nicht lesen', 'The own values of W cannot be read'), klein: d('Gib bis zu fünf Zahlen ein, durch Semikolon getrennt, zum Beispiel 2; 3,5; 5.', 'Geben Sie bis zu fünf Zahlen ein, durch Semikolon getrennt, zum Beispiel 2; 3,5; 5.', 'Enter up to five numbers separated by semicolons, for example 2; 3.5; 5.') });
    if (modell !== 6 && prozessEigen !== null && !prozessWInfo?.werte.length) p.push({ art: 'sperre', text: L('Für W ist kein Wert gewählt', 'No value is chosen for W'), klein: d('Wähle die 16./50./84. Perzentile, Mittelwert ± 1 SD oder gib eigene Werte ein.', 'Wählen Sie die 16./50./84. Perzentile, Mittelwert ± 1 SD oder geben Sie eigene Werte ein.', 'Choose the 16th/50th/84th percentiles, mean ± 1 SD or enter your own values.') });
    p.unshift({ art: n >= 50 ? 'ok' : 'hinweis', text: Lp(n, `${n} Person mit allen vier Angaben`, `${n} Personen mit allen vier Angaben`, `${n} person with all four answers`, `${n} people with all four answers`),
      klein: (aus > 0 ? Lp(aus, `${aus} Zeile mit einer Lücke wird ausgelassen. `, `${aus} Zeilen mit Lücken werden ausgelassen. `, `${aus} row with a gap is left out. `, `${aus} rows with gaps are left out. `) : '') + (pr.hinweise.includes('n-unter-50') ? L('Wechselwirkungen brauchen viele Personen, um entdeckt zu werden; unter 50 ist das Ergebnis sehr unsicher. ', 'Interactions need many people to be detected; below 50 the result is very uncertain. ') : '') + (pr.hinweise.includes('n-unter-30') ? L('Bei so wenigen Personen sind Bootstrap-Intervalle meist zu schmal.', 'With so few people bootstrap intervals are usually too narrow.') : '') });
    const wi = prozessWInfo;
    if (modell !== 6 && wi && wi.werte.length) {
      if (wi.zwei) p.push({ art: 'info', text: L(`${name(v)} hat zwei Werte`, `${name(v)} has two values`), klein: L('Statable zeigt die bedingten Effekte bei beiden Werten; der Index ist die Differenz.', 'Statable shows the conditional effects at both values; the index is the difference.') });
      else {
        if (wi.einzig) p.push({ art: 'hinweis', text: L(`Alle drei Perzentile von ${name(v)} sind gleich`, `All three percentiles of ${name(v)} are equal`), klein: d('Dann gibt es nur einen Wert für den bedingten Effekt. Wähle Mittelwert ± 1 SD oder eigene Werte.', 'Dann gibt es nur einen Wert für den bedingten Effekt. Wählen Sie Mittelwert ± 1 SD oder eigene Werte.', 'There is then only one value for the conditional effect. Choose mean ± 1 SD or your own values.') });
        else if (wi.zusammen) p.push({ art: 'hinweis', text: L(`Zwei Perzentile von ${name(v)} fallen zusammen`, `Two percentiles of ${name(v)} coincide`), klein: L('Es gibt nur zwei verschiedene Werte; Statable rechnet bei diesen beiden.', 'There are only two distinct values; Statable calculates at these two.') });
        if (wi.ausserhalb.some(Boolean)) p.push({ art: 'hinweis', text: L(`Ein Wert von ${name(v)} liegt außerhalb der beobachteten Werte`, `A value of ${name(v)} lies outside the observed values`), klein: L('Das ist eine Hochrechnung; das Ergebnis weist darauf hin.', 'This is an extrapolation; the result points it out.') });
        else if (kopiereProzess(zus.prozess).regel === 'perzentil' && wi.beobachtet.some(b => !b)) p.push({ art: 'info', text: L(`Ein Perzentil von ${name(v)} ist ein Zwischenwert`, `A percentile of ${name(v)} is an in-between value`), klein: L('Der Wert kommt in den Daten nicht vor (er liegt zwischen zwei beobachteten Werten); das Ergebnis weist darauf hin.', 'The value does not occur in the data (it lies between two observed values); the result points it out.') });
      }
      p.push({ art: 'info', text: L('Statable zentriert die beiden Faktoren eines Produkts am Mittelwert', 'Statable centers the two factors of a product at the mean'), klein: L('Die Einzelkoeffizienten gelten dann beim Mittelwert der anderen Größe; die Effekte und der Index bleiben gleich.', 'The single coefficients then hold at the mean of the other variable; the effects and the index stay the same.') });
    }
    p.push({ art: 'info', text: modell === 6 ? L('Kann Statable nicht prüfen: Läuft der Einfluss wirklich in dieser Reihenfolge, M1 vor M2?', "Statable can't check this: does the influence really run in this order, M1 before M2?") : L('Kann Statable nicht prüfen: Liegt der Zwischenschritt zeitlich und inhaltlich wirklich zwischen den beiden anderen?', "Statable can't check this: does the intermediate step really lie between the other two, in time and in content?"),
      klein: L('Mit Daten aus einer einzigen Befragung belegt eine Mediation keine Kausalität; die Richtung ist eine Annahme aus der Theorie.', 'With data from a single survey, a mediation does not establish causality; the direction is an assumption from theory.') });
    return p;
  }
  /** Die Beobachtungszeit steht auch unter den gewählten Spalten (`werte.l3`): so gehört sie zum Stand der Daten und zu den Spalten, die das Blatt braucht. */
  $effect(() => {
    if (verfahren?.id !== 'vorhersage') return;
    const soll = (katArt === 'zaehlreg' || modellArtEff === 'wls') && zus.modell.zeit ? [zus.modell.zeit] : [];
    if (werte.l3.length !== soll.length || werte.l3[0] !== soll[0]) untrack(() => { werte.l3 = soll; });
  });
  function modellSetzen(art: ModellArt) { const alt = zus.modell.art; zus.modell.art = art; if (art !== alt || (art !== 'zaehl' && art !== 'wls')) zus.modell.zeit = ''; if ((art === 'quantil' || art === 'penal') && !zus.vorh) zus.vorh = leereVorh(); }
  /** Das Angebot nach verletzter Parallelität: dieselbe Frage multinomial, Vergleichskategorie wie bisher die erste Stufe. */
  function multinomialWaehlen() { zus.modell = { ...zus.modell, art: 'multi', zeit: '', referenz: '' }; }
  /** Der Klick auf einen Vorschlag ist die Zustimmung: Modell wählen und sofort rechnen (R wird, wenn nötig, geladen - mit Lade-Animation). Kein Zwischenzustand „Stand der alten Auswahl“. */
  async function vorschlagRechnen(art: 'ordinal' | 'zaehl' | 'multi') {
    if (art === 'multi') multinomialWaehlen(); else modellSetzen(art);
    await tick();
    if (id === 'neu') { await rechnen(); return; }
    if (!vonSelbst) neuRechnen();
  }
  const multinomialRechnen = () => vorschlagRechnen('multi');
  /* ---------- Später S-E: Einstellungen der Quantilregression (τ, Intervall) und der Strafregression (α, λ-Regel, Standardisierung) ---------- */
  let tauFrei = $state(''), tauFehler = $state('');
  function vorhSchreiben(neu: Partial<ReturnType<typeof kopiereVorh>>) { zus.vorh = { ...kopiereVorh(zus.vorh), ...neu }; }
  function tauUmschalten(t: number) { const a = vorhEff.tau; vorhSchreiben({ tau: a.includes(t) ? a.filter(x => x !== t) : [...a, t].sort((p, q) => p - q) }); tauFehler = ''; }
  function tauFreiDazu() {
    const v = zahlAusText(tauFrei);
    if (v === null) { tauFehler = d('Das ist keine Zahl. Schreibe zum Beispiel 0,1.', 'Das ist keine Zahl. Schreiben Sie zum Beispiel 0,1.', 'That is not a number. Write for example 0.1.'); return; }
    const neu = [...new Set([...vorhEff.tau, v])].sort((p, q) => p - q), g = quantilTauGueltig(neu);
    if (!g.ok && g.grund !== 'leer') { tauFehler = quantilTauGrundText(g.grund!); return; }
    vorhSchreiben({ tau: neu }); tauFrei = ''; tauFehler = '';
  }
  const modellName = (m: ModellArt) => (m === 'nls' ? L('Nichtlineare Regression (feste Formel)', 'Nonlinear regression (fixed formula)') : m === 'linear' && zielBinaer ? L('Logit (Standard)', 'Logit (default)') : m === 'probit' ? L('Probit (Normalverteilung)', 'Probit (normal distribution)') : m === 'wls' ? L('Linear mit Präzisionsgewichten', 'Linear with precision weights') : m === 'linear' ? L('Linear (Standard)', 'Linear (default)') : m === 'ordinal' ? L('Ordinal (geordnete Stufen)', 'Ordinal (ordered levels)') : m === 'multi' ? L('Multinomial (Kategorien ohne Ordnung)', 'Multinomial (categories without order)') : m === 'quantil' ? L('Quantilregression (Median und andere Quantile)', 'Quantile regression (median and other quantiles)') : m === 'penal' ? L('Ridge, Lasso, Elastic Net (viele Vorhersagegrößen)', 'Ridge, lasso, elastic net (many predictors)') : L('Zähldaten (ganze Zahlen ab 0)', 'Count data (whole numbers from 0)'));
  const katHilfeId = (a: string | null | undefined) => (a === 'ordreg' ? 'ordinale-regression' : a === 'multreg' ? 'multinomiale-regression' : a === 'zaehlreg' ? 'zaehldaten-regression' : a === 'probit' ? 'probit-regression' : a === 'wls' ? 'gewichtete-regression' : a === 'nls' ? 'nichtlineare-regression' : null);   // eigene Artikel mit „Ergebnis lesen“ (Abnahme 31.10. F6: Probit zeigte die lineare Erklärung)
  /** Spalten, die als Beobachtungszeit in Frage kommen: Zahlen, nicht das Ziel und keine Vorhersagespalte. */
  const zeitSpalten = $derived(s.spalten.filter(sp => sp.art === 'zahl' && sp.name !== werte.l1[0] && !werte.l2.includes(sp.name) && !kennung(sp)));
  /** Die Prädiktoren je Block als Terme (Gruppen-Spalten mit Hilfsspalten), wenn die Wahl gilt und jeder Block belegt ist; sonst `null`. `praed`: die Spalten unter „Woraus?“. */
  const hierTerme = (praed: string[], z: ZusatzWahl): RegTerm[][] | null => (hierGueltig(praed, z.hier) ? hierBloecke(praed, z.hier).map(b => regTerme(b, ctx.faktor)) : null);
  /** Fälle, die mit Ziel und Block 1 allein vollständig wären, aber wegen Lücken in späteren Blöcken fehlen. */
  const hierLuecken = (ziel: string, bt: RegTerm[][]) => vollstaendig([ziel, ...bt[0]!.map(t => t.spalte)]).length - vollstaendig([ziel, ...bt.flat().map(t => t.spalte)]).length;
  /** Die Personen mit beiden Zahlen samt Zeilennummer der Daten (ab 1). */
  const paareMitZeile = (na: string, nb: string) => {
    const a = idx(na), b = idx(nb), fa = fehlendMenge(spalteNach(na)), fb = fehlendMenge(spalteNach(nb));
    return s.zeilen.flatMap((z, i) => (typeof z[a] === 'number' && typeof z[b] === 'number' && !fa.includes(z[a] as number) && !fb.includes(z[b] as number) ? [{ zeile: i + 1, vorher: z[a] as number, nachher: z[b] as number }] : []));
  };
  /** Skalen, deren Fragen alle als Zahlenspalten vorkommen (Quelle für Cronbachs Alpha). */
  const alphaSkalen = $derived(s.skalen.filter(sk => sk.fragen.length >= 2 && sk.fragen.every(f => spalteNach(f)?.art === 'zahl')));
  /** Die Reliabilität für den RCI: eingegeben (Retest) oder Cronbachs Alpha der Items einer Skala; sonst der Grund, warum nicht (für die Prüfliste). */
  function rciReliabilitaet(z: ZusatzWahl): { r: number; q: RciQuelle } | { fehler: string; klein: string } {
    if (z.rci.quelle === 'retest') {
      const r = reliabilitaetAusText(z.rci.r);
      if (r !== null) return { r, q: { quelle: 'retest' } };
      return z.rci.r.trim() === '' ? { fehler: L('Die Reliabilität fehlt', 'The reliability is missing'), klein: d('Gib die Reliabilität ein, am besten die Retest-Reliabilität aus dem Testhandbuch (eine Zahl von 0 bis unter 1, zum Beispiel ,85). Ein Standardwert wäre geraten.', 'Geben Sie die Reliabilität ein, am besten die Retest-Reliabilität aus dem Testhandbuch (eine Zahl von 0 bis unter 1, zum Beispiel ,85). Ein Standardwert wäre geraten.', 'Enter the reliability, ideally the retest reliability from the test manual (a number from 0 to below 1, for example .85). A default value would be a guess.') }
        : { fehler: L('Die Reliabilität muss von 0 bis unter 1 liegen', 'The reliability must be from 0 to below 1'), klein: L('Eine Reliabilität von 1 oder mehr gibt es nicht, und bei 1 wäre der Messfehler 0. Beispiel: ,85.', 'A reliability of 1 or more does not exist, and at 1 the measurement error would be 0. Example: .85.') };
    }
    const sk = alphaSkalen.find(x => x.name === z.rci.skala);
    if (!sk) return { fehler: L('Die Skala für Cronbachs Alpha fehlt', "The scale for Cronbach's alpha is missing"), klein: d('Wähle die Skala, deren Items die erste Messung bilden. Skalen legst du unter „Spalten“ fest.', 'Wählen Sie die Skala, deren Items die erste Messung bilden. Skalen legen Sie unter „Spalten“ fest.', 'Choose the scale whose items make up the first measurement. You define scales under "Columns".') };
    const voll = vollstaendig(sk.fragen).filter(r => r.every(v => typeof v === 'number')) as number[][], alpha = alphaAus(voll);
    if (alpha === null) return { fehler: L(`Cronbachs Alpha der Skala „${sk.name}“ lässt sich nicht rechnen`, `Cronbach's alpha of the scale "${sk.name}" cannot be calculated`), klein: L('Es braucht mindestens zwei Personen mit allen Items und Unterschiede in der Summe.', 'It needs at least two people with all items and differences in the sum.') };
    if (alpha < 0 || alpha >= 1) return { fehler: L(`Cronbachs Alpha der Skala „${sk.name}“ ist ${ohneNull(alpha)}`, `Cronbach's alpha of the scale "${sk.name}" is ${ohneNull(alpha)}`), klein: L('Der RCI braucht eine Reliabilität von 0 bis unter 1. Ein negatives Alpha deutet auf falsch gepolte Items hin.', 'The RCI needs a reliability from 0 to below 1. A negative alpha points to wrongly keyed items.') };
    return { r: alpha, q: { quelle: 'alpha', skala: sk.name, alphaN: voll.length, alphaItems: sk.fragen.length } };
  }
  /** Äquivalenztest und RCI zu den Prä-Post-Spalten (Felder `tost` und `rci` des Ergebnisses); was sich nicht rechnen lässt, fehlt. */
  function praePostZusatz(l1: string, l2: string, z: ZusatzWahl): { tost?: TostAnzeige; rci?: RciAnzeige } {
    const aus: { tost?: TostAnzeige; rci?: RciAnzeige } = {};
    if (!z.tost.an && !z.rci.an) return aus;
    const paare = paareMitZeile(l1, l2);
    const dl = z.tost.an ? deltaAusText(z.tost.delta) : null;
    const tost = dl === null ? null : tostAusPaaren(paare.map(p => [p.vorher, p.nachher] as [number, number]), dl, l1, l2);
    if (tost) aus.tost = tost;
    const rel = z.rci.an && z.rci.richtung ? rciReliabilitaet(z) : null;
    const rci = rel && 'r' in rel ? rciAnzeige(paare, rel.r, rel.q, z.rci.richtung === 'besser', l1, l2) : null;
    if (rci) aus.rci = rci;
    return aus;
  }
  /** Punkte der Prüfliste zu den beiden Zusatzverfahren: fehlende Pflichtangaben sperren das Rechnen. */
  function zusatzPunkte(): Punkt[] {
    const p: Punkt[] = [];
    if (zusEff.tost.an) {
      const dl = deltaAusText(zus.tost.delta);
      if (dl === null) p.push({ art: 'sperre', text: zus.tost.delta.trim() === '' ? L('Äquivalenztest: Die Grenze Δ fehlt', 'Equivalence test: the bound Δ is missing') : L('Äquivalenztest: Die Grenze Δ muss eine Zahl größer als 0 sein', 'Equivalence test: the bound Δ must be a number greater than 0'),
        klein: d('Gib den größten Unterschied ein, den du noch als gleichwertig gelten lässt, in den Einheiten der Messung. Er muss vor der Auswertung begründet sein; einen Standardwert gibt es nicht.', 'Geben Sie den größten Unterschied ein, den Sie noch als gleichwertig gelten lassen, in den Einheiten der Messung. Er muss vor der Auswertung begründet sein; einen Standardwert gibt es nicht.', 'Enter the largest difference you still accept as equivalent, in the units of the measure. It must be justified before the analysis; there is no default value.') });
      else p.push({ art: 'info', text: L(`Äquivalenztest mit den Grenzen ±${dez(String(dl))}`, `Equivalence test with the bounds ±${dez(String(dl))}`), klein: L('Zwei einseitige Tests (TOST) und ein 90 %-Intervall der Differenz. Die Grenzen nach dem Rechnen zu ändern, um ein Ergebnis zu erreichen, ist nicht zulässig.', 'Two one-sided tests (TOST) and a 90% interval of the difference. Changing the bounds after calculating in order to reach a result is not acceptable.') });
    }
    if (zusEff.umfrage?.test) {   // Später S-D2 (A2): Test des Mittelwerts gegen einen Wert (Umfragegewicht)
      const wert = umfrageTestWert(zusEff.umfrage);
      if (wert === null) p.push({ art: 'sperre', text: (zusEff.umfrage.wert ?? '').trim() === '' ? L('Test gegen einen Wert: Der Wert fehlt', 'Test against a value: the value is missing') : L('Test gegen einen Wert: Der Wert muss eine Zahl sein', 'Test against a value: the value must be a number'),
        klein: d('Gib die Zahl ein, gegen die der Mittelwert getestet werden soll, zum Beispiel 3 oder 50,5. Sie muss vor der Auswertung feststehen.', 'Geben Sie die Zahl ein, gegen die der Mittelwert getestet werden soll, zum Beispiel 3 oder 50,5. Sie muss vor der Auswertung feststehen.', 'Enter the number against which the mean is to be tested, for example 3 or 50.5. It must be fixed before the analysis.') });
      else p.push({ art: 'info', text: L(`Der Mittelwert wird gegen ${dez(String(wert))} getestet`, `The mean is tested against ${dez(String(wert))}`), klein: L('Zweiseitig, t-Test mit dem Standardfehler der Umfrage (n − 1 Freiheitsgrade).', 'Two-sided, t test with the survey standard error (n − 1 degrees of freedom).') });
    }
    if (zusEff.rci.an) {
      if (!zus.rci.richtung) p.push({ art: 'sperre', text: L('RCI: Es fehlt, ob hohe Werte besser oder schlechter sind', 'RCI: it is missing whether high values are better or worse'), klein: L('Davon hängt ab, ob eine Zunahme als Verbesserung oder Verschlechterung gilt. Statable rät das nicht.', 'It decides whether an increase counts as an improvement or a worsening. Statable does not guess it.') });
      const rel = rciReliabilitaet(zus);
      if ('fehler' in rel) p.push({ art: 'sperre', text: `RCI: ${rel.fehler}`, klein: rel.klein });
      else p.push({ art: rel.q.quelle === 'alpha' ? 'hinweis' : 'info', text: rel.q.quelle === 'alpha' ? L(`RCI mit Cronbachs Alpha = ${ohneNull(rel.r)} statt der Retest-Reliabilität`, `RCI with Cronbach's alpha = ${ohneNull(rel.r)} instead of the retest reliability`) : L(`RCI mit der Reliabilität r = ${ohneNull(rel.r)}`, `RCI with the reliability r = ${ohneNull(rel.r)}`),
        klein: rel.q.quelle === 'alpha' ? L('Alpha ist nur ein Ersatz: Es misst die innere Konsistenz, nicht die Stabilität über die Zeit, und fällt meist höher aus. Die Retest-Reliabilität ist die eigentliche Wahl.', 'Alpha is only a substitute: it measures internal consistency, not stability over time, and is usually higher. The retest reliability is the proper choice.') : L('Die Standardabweichung der Vorher-Werte (nicht der Differenzen) und diese Reliabilität bestimmen den Messfehler der Veränderung.', 'The standard deviation of the before values (not of the differences) and this reliability determine the measurement error of the change.') });
    }
    if (zus.zufall?.an && zufallMoeglich && zufallGrund === null) {
      if (!zufallEingabeOk) p.push({ art: 'sperre', text: L('Zufallsverfahren: Zahl der Ziehungen oder Startwert stimmt nicht', 'Random procedure: the number of draws or the seed is not right'), klein: L('Die Zahl der Ziehungen B ist eine ganze Zahl von 99 bis 99 999, der Startwert eine ganze Zahl von 0 bis 4 294 967 295.', 'The number of draws B is a whole number from 99 to 99,999, the seed a whole number from 0 to 4,294,967,295.') });
      else p.push({ art: 'info', text: L(`Zufallsverfahren: ${zus.zufall.B} Ziehungen, Startwert ${zus.zufall.startwert}`, `Random procedure: ${zus.zufall.B} draws, seed ${zus.zufall.startwert}`), klein: L('Der Permutationstest und das Bootstrap-Intervall stehen unter dem Ergebnis; Art des Intervalls, Zahl der Ziehungen und Startwert stehen dabei.', 'The permutation test and the bootstrap interval are shown under the result; the type of interval, the number of draws and the seed are given with them.') });
    }
    if (zusEff.hier.an) {
      const bl = hierBloecke(werte.l2, zusEff.hier), bt = hierTerme(werte.l2, zusEff);
      if (!bt) {
        const leer = bl.flatMap((b, i) => (b.length ? [] : [i + 1]));
        p.push({ art: 'sperre', text: Lp(leer.length, `Blöcke bilden: Block ${leer.join(', ')} hat keine Spalte`, `Blöcke bilden: Blöcke ${leer.join(', ')} haben keine Spalte`, `Building blocks: block ${leer.join(', ')} has no column`, `Building blocks: blocks ${leer.join(', ')} have no column`),
          klein: L('Jede Spalte gehört zu genau einem Block, und jeder Block braucht mindestens eine Spalte. Weniger Blöcke wählen oder Spalten verschieben.', 'Every column belongs to exactly one block, and every block needs at least one column. Choose fewer blocks or move columns.'), erklaer: 'regression' });
      } else {
        const alle = [werte.l1[0]!, ...bt.flat().map(t => t.spalte)], nVoll = vollstaendig(alle).length, koeff = regVariablen(bt.flat()).length, luecken = hierLuecken(werte.l1[0]!, bt);
        if (nVoll < koeff + 2) p.push({ art: 'sperre', text: L(`Blöcke bilden: zu wenige Fälle (${nVoll} mit allen Angaben, nötig sind mindestens ${koeff + 2})`, `Building blocks: not enough cases (${nVoll} with all answers, at least ${koeff + 2} needed)`), klein: L('Mit so wenigen Fällen lässt sich das Modell mit allen Blöcken nicht prüfen.', 'With so few cases the model with all blocks cannot be tested.') });
        else p.push({ art: 'info', text: L(`Hierarchische Regression in ${bt.length} Blöcken: ${bl.map((b, i) => `Block ${i + 1}: ${b.map(name).join(', ')}`).join(' · ')}`, `Hierarchical regression in ${bt.length} blocks: ${bl.map((b, i) => `block ${i + 1}: ${b.map(name).join(', ')}`).join(' · ')}`),
          klein: Lp(luecken,
            `Statable rechnet je Block ein Modell, alle auf denselben ${nVoll} Fällen (${luecken} Fall fällt wegen Lücken in späteren Blöcken auch aus Block 1 heraus). Die Reihenfolge der Blöcke ist theoretisch zu begründen, nicht nach dem Ergebnis zu wählen.`,
            `Statable rechnet je Block ein Modell, alle auf denselben ${nVoll} Fällen (${luecken} Fälle fallen wegen Lücken in späteren Blöcken auch aus Block 1 heraus). Die Reihenfolge der Blöcke ist theoretisch zu begründen, nicht nach dem Ergebnis zu wählen.`,
            `Statable calculates one model per block, all on the same ${nVoll} cases (${luecken} case drops out of block 1 as well because of gaps in later blocks). The order of the blocks is to be justified by theory, not chosen after seeing the result.`,
            `Statable calculates one model per block, all on the same ${nVoll} cases (${luecken} cases drop out of block 1 as well because of gaps in later blocks). The order of the blocks is to be justified by theory, not chosen after seeing the result.`), erklaer: 'regression' });
      }
    }
    return p;
  }
  /** Prüfliste für McNemar und Cochran-Q (G5): dieselben Spalten mit denselben zwei Antworten, welcher Wert „ja“ zählt, wie viele Personen, wie viele Wechsel. */
  function jaNeinPruefliste(): Punkt[] {
    const spalten = verfahren!.id === 'praepost' ? [werte.l1[0]!, werte.l2[0]!] : werte.l1, mc = spalten.length === 2, p: Punkt[] = [];
    if (new Set(spalten).size < spalten.length) return [{ art: 'sperre', text: L('Eine Spalte steht mehrfach', 'A column is used more than once'), klein: d('Wähle für jeden Zeitpunkt eine andere Spalte.', 'Wählen Sie für jeden Zeitpunkt eine andere Spalte.', 'Choose a different column for each time point.') }];
    const kod = gemeinsamJaNein(spalten.map(n => jaNeinVon(n, jaUmkehr)));
    if (!kod) return [{ art: 'sperre', text: L('Die Spalten haben nicht dieselben zwei Antworten', 'The columns do not have the same two answers'), klein: d('Alle Spalten müssen dieselben zwei Antworten enthalten, zum Beispiel 0 und 1 oder „ja“ und „nein“. Gleiche die Kodierung in den Daten an.', 'Alle Spalten müssen dieselben zwei Antworten enthalten, zum Beispiel 0 und 1 oder „ja“ und „nein“. Gleichen Sie die Kodierung in den Daten an.', 'All columns must contain the same two answers, for example 0 and 1 or "yes" and "no". Make the coding in the data the same.') }];
    const voll = vollstaendig(spalten), n = voll.length, aus = s.zeilen.length - n;
    if (!mc && werte.l2[0]) p.push({ art: 'sperre', text: L('Cochran-Q kennt keine Gruppen', "Cochran's Q does not use groups"), klein: d('Nimm die Gruppenspalte heraus. Cochran-Q vergleicht die Zeitpunkte bei allen Personen zusammen.', 'Nehmen Sie die Gruppenspalte heraus. Cochran-Q vergleicht die Zeitpunkte bei allen Personen zusammen.', "Remove the group column. Cochran's Q compares the time points across all people together.") });
    if (n < 2) p.push({ art: 'sperre', text: L(`Zu wenige Personen: ${n} mit allen Angaben, nötig sind mindestens 2`, `Not enough people: ${n} with all answers, at least 2 needed`), klein: L('Mit so wenigen Personen lässt sich nichts berechnen.', 'With so few people nothing can be calculated.') });
    else {
      p.push({ art: n >= 20 ? 'ok' : 'hinweis', text: Lp(n, `${n} Person mit allen Angaben`, `${n} Personen mit allen Angaben`, `${n} person with all answers`, `${n} people with all answers`), klein: aus > 0 ? Lp(aus, `${aus} Zeile mit einer Lücke wird ausgelassen.`, `${aus} Zeilen mit Lücken werden ausgelassen.`, `${aus} row with a gap is left out.`, `${aus} rows with gaps are left out.`) : undefined });
      if (mc) {
        const wechsel = voll.filter(z => alsNull1(z[0]!, kod, spalteNach(spalten[0]!)?.art === 'zahl') !== alsNull1(z[1]!, kod, spalteNach(spalten[1]!)?.art === 'zahl')).length;
        p.push(wechsel === 0 ? { art: 'hinweis', text: L('Keine Person hat die Antwort geändert', 'No one changed their answer'), klein: L('Damit lässt sich kein Test rechnen; das Blatt sagt das in einem Satz.', 'No test can be calculated with that; the page says so in one sentence.') }
          : wechsel < 10 ? { art: 'hinweis', text: Lp(wechsel, `Nur ${wechsel} Person hat die Antwort geändert`, `Nur ${wechsel} Personen haben die Antwort geändert`, `Only ${wechsel} person changed their answer`, `Only ${wechsel} people changed their answer`), klein: L('Nur diese Personen gehen in den Test ein. Der exakte Test rechnet auch mit wenigen Wechseln, das Ergebnis ist dann aber unsicher.', 'Only these people enter the test. The exact test also works with few changes, but the result is then uncertain.') }
          : { art: 'ok', text: Lp(wechsel, `${wechsel} Person hat die Antwort geändert`, `${wechsel} Personen haben die Antwort geändert`, `${wechsel} person changed their answer`, `${wechsel} people changed their answer`), klein: L('Nur diese Personen gehen in den Test ein (exakter Binomialtest).', 'Only these people enter the test (exact binomial test).') });
      }
    }
    p.push({ art: 'info', text: jaNeinSatz(kod), klein: L('Im Ergebnis lässt sich das vertauschen. PSPP nennt dagegen den Wert, der in den Daten zuerst steht, „Success“; bei Statable spielt die Reihenfolge der Zeilen keine Rolle.', 'You can swap this in the result. PSPP instead calls the value that appears first in the data "Success"; for Statable the order of the rows does not matter.') });
    p.push({ art: 'info', text: L('Kann Statable nicht prüfen: Sind alle Spalten dieselbe Frage von denselben Personen in derselben Zeile?', "Statable can't check this: are all columns the same question from the same people in the same row?"), klein: L('Jede Zeile der Daten muss eine Person sein.', 'Each row of the data must be one person.') });
    return p;
  }
  /** Das Fallgewicht in der Prüfliste (Fachblatt S-A, 1.4 und 1.5): Pflichtfrage offen oder Spalte unbrauchbar sperrt; ein Verfahren, das Gewichte noch nicht richtig verarbeitet, ist gesperrt (mit Satz);
   *  Karten, in denen das Fallgewicht nichts bedeutet, zeigen einen Hinweis. Sonst steht eine Zeile, dass gewichtet gerechnet wird. */
  /** Mit Häufigkeitsgewicht: Zeilen mit allen gewählten Angaben (und Gewicht über 0) und die Summe ihrer Gewichte - die Prüfliste zählt sonst Zeilen, das Ergebnis Fälle. */
  function zeilenUndFaelle(g: { spalte: string }): { zeilen: number; faelle: number } | null {
    const namen = [...werte.l1, ...werte.l2, ...werte.l3, ...werte.l4].filter(n => n && !istSetName(n) && spalteNach(n));
    if (!namen.length) return null;
    const ix = namen.map(idx), sps = namen.map(n => spalteNach(n)), w = gewichtsWerte(g.spalte);
    let zeilen = 0, faelle = 0;
    s.zeilen.forEach((z, r) => {
      const gw = w[r];
      if (typeof gw !== 'number' || !(gw > 0)) return;
      if (ix.every((i, k) => z[i] !== null && z[i] !== undefined && z[i] !== '' && !(typeof z[i] === 'number' && istFehlend(sps[k], z[i] as number)))) { zeilen++; faelle += gw; }
    });
    return { zeilen, faelle };
  }
  function gewichtPunkte(): Punkt[] {
    if (!verfahren) return [];
    const lage = gewichtLage();
    if (lage.art === 'aus') return [];
    if (lage.art === 'frage') return [{ art: 'sperre', gewicht: true, text: L(`Erst klären: Was bedeutet das Fallgewicht ${lage.spalte}?`, `Clear this up first: what does the case weight ${lage.spalte} mean?`), klein: L('Statable rechnet erst weiter, wenn feststeht, ob es ein Häufigkeits- oder ein Umfragegewicht ist.', 'Statable does not calculate further until it is clear whether it is a frequency weight or a survey weight.'), knopf: L('Fallgewicht angeben', 'Specify the case weight') }];
    if (lage.art === 'fehler') return [{ art: 'sperre', gewicht: true, text: gewichtFehlerSatz(lage.pruefung, lage.gewicht), klein: L('Die Spalte wurde nach dem Setzen des Fallgewichts verändert.', 'The column was changed after the case weight was set.'), knopf: L('Fallgewicht ändern', 'Change the case weight') }];
    const g = lage.gewicht, p: Punkt[] = [], schon = new Set<string>();
    const sets = [...werte.l1, ...werte.l2].some(istSetName);
    const emp = verfahren.id === 'zusammenhang' && werte.l1[0] && werte.l2[0] ? empfohleneKorrelation(werte.l1[0], werte.l2[0], ctx).methode : 'pearson';
    const stellen = gewichtStellen({
      verfahren: verfahren.id, art: g.art, klumpenfrei: klumpenfreiFuer(verfahren.id, g), set: sets, gruppen2: verfahren.id === 'gruppen' && (werte.l3.length > 0 || werte.l4.length > 0),
      logistik: verfahren.id === 'vorhersage' && !!werte.l1[0] && ctx.verschieden(werte.l1[0]) === 2, katModell: katArt !== null, quantil: vorhArt === 'quantil', penalisiert: vorhArt === 'penal', probit: kursArt === 'probit', wls: kursArt === 'wls', nls: kursArt === 'nls',
      rangKorr: verfahren.id === 'zusammenhang' && (werte.l3.length > 0 || emp !== 'pearson'), jaNein: !!jaNeinFall(verfahren, werte),
      iccInter: verfahren.id === 'uebereinstimmung' && werte.l1.length > 0 && uebereinstimmungsArt(werte.l1, ctx, uebWunsch ?? undefined).art !== 'kappa',
      aequi: zusEff.tost.an || zusEff.rci.an, masse: masseAn(zusEff), schicht: !!zusEff.schicht, zufall: !!zusEff.zufall?.an, mittelTest: !!zusEff.umfrage?.test, bedingt: verfahren.id === 'mediation' && prozessModell !== 4 && !!werte.l4[0],
      bloecke: verfahren.id === 'vorhersage' && zusEff.hier.an, sterbetafel: sterbeAn, coxZeit: coxZeitAn, aft: aftAn, frailty: frailtyAn, kreuz: verfahren.id === 'zeitreihen' && !!werte.l3[0],   // Später S-F (A), S-F2 (D)
      methodenvergleich: verfahren.id === 'uebereinstimmung' && !!blatt?.mv?.an   // Später S-F (B)
    });
    for (const st of stellen) {
      const satz = sperrSatz(st.id, { ...g, klumpenfrei: klumpenfreiFuer(verfahren.id, g) }, st.titel);   // dasselbe „Ja“ wie bei den Stellen oben: sonst entsperrt es eine Karte, die noch nicht designbasiert rechnet
      if (!satz || schon.has(satz)) continue;
      schon.add(satz);
      const ende = satz.indexOf('. ');   // der erste Satz fett, der Rest klein darunter
      p.push(st.status === 'sperren' ? { art: 'sperre', gewicht: true, text: ende < 0 ? satz : satz.slice(0, ende + 1), ...(ende < 0 ? {} : { klein: satz.slice(ende + 2) }), knopf: L('Fallgewicht ändern', 'Change the case weight') } : { art: 'info', text: satz });
    }
    // Später S-D2: logistische Regression mit Umfragegewicht - ROC-Kurve und AUC entfallen mit einem Satz, das Blatt wird nicht gesperrt
    if (stellen.some(st => st.id === 'vorhersage:logistik')) p.push({ art: 'info', gewicht: true, text: rocEntfaelltSatz() });
    // Faktorenanalyse: die Hauptkomponenten rechnen mit dem Häufigkeitsgewicht, die Parallelanalyse nicht (Sperrtabelle `faktor:parallel`) - sie entfällt mit einem Satz
    if (verfahren.id === 'faktor' && g.art === 'haeufigkeit' && gewichtStatus('faktor:parallel', g.art) === 'sperren')
      p.push({ art: 'info', gewicht: true, text: L('Die Parallelanalyse ist mit Fallgewichten gesperrt und fehlt im Ergebnis.', 'The parallel analysis is blocked with case weights and is missing from the result.'), klein: L(`Sie simuliert Stichproben aus den Zeilen und würde jede Zeile einmal zählen, obwohl das Fallgewicht ${g.spalte} Mehrfachzählungen vorgibt. Hauptkomponenten, Kaiser-Kriterium und KMO rechnen mit dem Fallgewicht.`, `It simulates samples from the rows and would count every row once, although the case weight ${g.spalte} implies repeated counts. Principal components, the Kaiser criterion and KMO are calculated with the case weight.`) });
    // Cohens Kappa mit Häufigkeitsgewicht rechnet aus den erweiterten Zeilen: darüber gesperrt (zu groß)
    if (g.art === 'haeufigkeit' && verfahren.id === 'uebereinstimmung' && g.summe > ERWEITERN_MAX)
      p.push({ art: 'sperre', gewicht: true, text: L(`Die Summe der Fallgewichte (${zahlDe(g.summe)}) ist zu groß für diese Auswertung (höchstens ${zahlDe(ERWEITERN_MAX)}).`, `The sum of the case weights (${zahlDe(g.summe)}) is too large for this analysis (at most ${zahlDe(ERWEITERN_MAX)}).`), knopf: L('Fallgewicht ändern', 'Change the case weight') });
    if (!p.some(x => x.art === 'sperre') && !stellen.some(st => st.status === 'hinweis')) {
      // Später S-D2: berührt die Frage eine Stelle mit Status `design`, steht der Satz der designbasierten Rechnung (Fachblatt 0.6)
      const mitDesign = g.art === 'umfrage' && stellen.some(st => st.status === 'design');
      p.unshift({ art: 'info', gewicht: true, text: mitDesign ? designInfoSatz(g) : L(`Gerechnet wird ${gewichtSatz(g, g.summe, g.zeilen)}`, `Calculated ${gewichtSatz(g, g.summe, g.zeilen)}`),
        klein: mitDesign ? `${designKleinSatz(g.entwurf)}${g.entwurf ? '' : ' ' + kishSatz(lage.pruefung.w)}` : g.art === 'haeufigkeit' ? `${L('Die Zahl der Fälle ist die Summe der Gewichte. Zeilen mit dem Gewicht 0 oder ohne Gewicht zählen nicht.', 'The number of cases is the sum of the weights. Rows with the weight 0 or without a weight are not counted.')}${(() => { const zf = zeilenUndFaelle(g); return zf ? ' ' + Lp(zf.zeilen, `${zf.zeilen} Zeile hat alle gewählten Angaben, gewichtet sind das ${zahlDe(zf.faelle)} Fälle.`, `${zf.zeilen} Zeilen haben alle gewählten Angaben, gewichtet sind das ${zahlDe(zf.faelle)} Fälle.`, `${zf.zeilen} row has all the chosen answers, weighted that is ${zahlDe(zf.faelle)} cases.`, `${zf.zeilen} rows have all the chosen answers, weighted that is ${zahlDe(zf.faelle)} cases.`) : ''; })()}`
          : `${L('Nur beschreibend: gewichtete Mittelwerte, Anteile und Prozente. Tests, Intervalle und Standardfehler gibt es mit einem Umfragegewicht nicht.', 'Descriptive only: weighted means, proportions and percentages. With a survey weight there are no tests, intervals or standard errors.')} ${klumpenSperrSatz()} ${kishSatz(lage.pruefung.w)}`,
        knopf: L('Fallgewicht ändern', 'Change the case weight') });
    }
    return p;
  }
  const metaPrueflisteWert = $derived(metaPruefung(metaEntwurf, L));
  /** Später S-E, Zeitreihen: die Prüfliste aus der Reihe (Raster, Lücken, Länge); Sperren und Hinweise sind Sätze aus lib/zeitreihesaetze.ts. */
  const zeitPunkte = $derived.by((): Punkt[] => {
    if (verfahren?.id !== 'zeitreihen' || !fertigGewaehlt) return [];
    const v = zeitreiheVorpruefung(werte.l1[0]!, werte.l2[0] ?? '', werte.l3[0] ?? '');
    if (!v.ok) return [{ art: 'sperre', text: v.satz }];
    return [{ art: 'ok', text: v.kopf }, ...v.hinweise.map(h => ({ art: 'hinweis' as const, text: h })), ...(v.sperre ? [{ art: 'sperre' as const, text: v.sperre }] : [])];
  });
  /** Später S-E, Clusteranalyse: Verfahren (Ward bis 3000 Fälle, darüber k-Means) und Prüfliste aus den Daten. */
  const clusterVerfahren = $derived<'ward' | 'kmeans'>(verfahren?.id === 'cluster' && fertigGewaehlt && s.zeilen.length > WARD_MAX ? 'kmeans' : 'ward');
  const clusterPunkte = $derived.by((): Punkt[] => {
    if (verfahren?.id !== 'cluster' || !fertigGewaehlt) return [];
    const v = clusterVorpruefung(werte.l1, clusterVerfahren, 2, false), n = v.daten.zeilen.length;
    const ctxC = { n, k: 2, ausgeschlossen: v.daten.ausgelassen, anzahl: v.codes.includes('konstant') ? v.daten.konstante.length : v.daten.nAusreisser };
    const sperrCodes = new Set(['gewicht', 'text-merkmal', 'zu-wenig-merkmale', 'zu-viele-merkmale', 'alle-gleich', 'zu-wenig-faelle', 'k-zu-gross', 'ward-zu-gross', 'kmeans-zu-gross']);
    return [{ art: 'ok', text: Lp(n, `${n} Fall mit Angaben in allen Merkmalen`, `${n} Fälle mit Angaben in allen Merkmalen`, `${n} case with values in all features`, `${n} cases with values in all features`),
        klein: clusterVerfahren === 'ward' ? L('Statable rechnet das Ward-Verfahren mit z-standardisierten Merkmalen; unter „Weitere Wege“ im Ergebnis lässt sich k-Means wählen.', 'Statable calculates Ward\'s method with z-standardized features; k-means can be chosen under "More options" in the result.') : L('Bei so vielen Fällen rechnet Statable k-Means mit z-standardisierten Merkmalen.', 'With this many cases Statable calculates k-means with z-standardized features.') },
      ...v.codes.map(c => ({ art: (sperrCodes.has(c) ? 'sperre' : 'hinweis') as 'sperre' | 'hinweis', text: clusterCodeSatz(c, ctxC) }))];
  });
  /** Kurs-Paket: Sperren und Hinweise aus den Daten (lib/diskriminanz.ts, loglinear.ts, manova.ts); alles JavaScript, R rechnet erst auf Klick. */
  const kpPunkte = $derived.by((): Punkt[] => {
    if (!kpKarte || !fertigGewaehlt) return [];
    try {
      if (kpKarte === 'diskriminanz') return diskrPunkte(diskrDaten(werte.l1[0]!, werte.l2, s.zeilen, s.spalten), name);
      if (kpKarte === 'loglinear') return logPunkte(logDaten(werte.l1, werte.l2[0] ?? null, s.zeilen, s.spalten), name);
      if (kpKarte === 'armut') return armutPunkte(armutDaten(werte.l1[0]!, werte.l2[0]!, werte.l3[0] ?? null, werte.l4[0] ?? null, s.zeilen, s.spalten));
      return manovaPunkte(manovaDaten(werte.l2[0]!, werte.l1, s.zeilen, s.spalten), name);
    } catch { return []; }
  });
  const pruefliste = $derived.by((): Punkt[] => {
    if (!verfahren || !fertigGewaehlt) return [];
    if (verfahren.id === 'meta') return [...gewichtPunkte(), ...metaPrueflisteWert.punkte];   // Fallgewicht: Hinweis „wird hier nicht verwendet“
    if (verfahren.id === 'kategorien') return [...gewichtPunkte(), ...katVorpruefung(werte.l1[0]!)];
    if (verfahren.id === 'zeitreihen') return [...gewichtPunkte(), ...zeitPunkte];   // Später S-E: Raster, Lücken, Länge - alles JavaScript, ohne Fund-Prüfung der Spalten
    if (verfahren.id === 'cluster') return [...gewichtPunkte(), ...clusterPunkte];
    if (kpKarte) return [...gewichtPunkte(), ...kpPunkte];   // Kurs-Paket   // Texte brauchen keine Funde-Prüfung (Platzhalter sind Antworten), nur: gibt es Antworten?
    const p: Punkt[] = [], alle = [...werte.l1, ...werte.l2, ...werte.l3, ...werte.l4];
    p.push(...gewichtPunkte());
    for (const f of s.funde) {
      if (!alle.includes(f.spalte) || s.entscheid[fundSchluessel(f)]) continue;
      if (f.art === 'platzhalter') p.push({ art: 'sperre', text: Lp(f.anzahl, `Erst klären: Bei ${name(f.spalte)} steht ${f.anzahl}-mal ${zitat(String(f.wert))}.`, `Erst klären: Bei ${name(f.spalte)} steht ${f.anzahl}-mal ${zitat(String(f.wert))}.`, `Clear this up first: ${name(f.spalte)} contains ${zitat(String(f.wert))} ${f.anzahl} time.`, `Clear this up first: ${name(f.spalte)} contains ${zitat(String(f.wert))} ${f.anzahl} times.`), klein: L('Wenn das „keine Angabe“ heißt, würde es das Ergebnis stark verzerren.', 'If that means "no answer", it would distort the result a lot.'), fund: fundSchluessel(f), knopf: L('Als „keine Angabe“ behandeln', 'Treat as "no answer"') });
      if (f.art === 'schreibweise') p.push({ art: 'hinweis', text: L(`${name(f.spalte)} ist unterschiedlich geschrieben`, `${name(f.spalte)} is spelled in different ways`), klein: L(`Statable zählt ${Object.keys(f.vorher).slice(0, 6).map(x => `„${x}“`).join(', ')} als getrennte Gruppen. Wenn sie dasselbe meinen, fasse sie zusammen.`, `Statable counts ${Object.keys(f.vorher).slice(0, 6).map(x => `"${x}"`).join(', ')} as separate groups. If they mean the same, merge them.`), fund: fundSchluessel(f), knopf: L('Schreibweisen zusammenfassen', 'Merge spellings') });
      if (f.art === 'ausreisser') p.push({ art: 'hinweis', text: f.wert < f.spanne[0] ? L(`Ein sehr niedriger Wert bei ${name(f.spalte)}`, `A very low value in ${name(f.spalte)}`) : L(`Ein sehr hoher Wert bei ${name(f.spalte)}`, `A very high value in ${name(f.spalte)}`), klein: L(`Zeile ${f.zeile + 1}: ${zahlDe(f.wert)}. Rechnen geht trotzdem.`, `Row ${f.zeile + 1}: ${zahlDe(f.wert)}. You can still calculate.`), erklaer: 'ausreisser' });
    }
    // Prüfung G2/G3: eine Spalte mit überall demselben Wert gibt in Regression und Faktorenanalyse Unsinn (R² = 1, b = −2E+224, Tabellen aus Punkten).
    if (verfahren.id === 'vorhersage' || verfahren.id === 'faktor' || verfahren.id === 'skala') {
      const fest = alle.filter(n => n && !istSetName(n) && spalteNach(n) && !(vorhArt === 'penal' && werte.l2.includes(n)) && konstant(spaltenWerte(n), fehlendMenge(spalteNach(n))));   // Strafregression lässt konstante Vorhersagespalten selbst weg (Satz in der Prüfliste), das Ziel nicht
      if (fest.length) p.push({ art: 'sperre', text: Lp(fest.length, `${aufzaehlung(fest.map(name))} hat überall denselben Wert`, `${aufzaehlung(fest.map(name))} haben überall denselben Wert`, `${aufzaehlung(fest.map(name))} has the same value everywhere`, `${aufzaehlung(fest.map(name))} have the same value everywhere`),
        klein: d(`Eine Spalte ohne Unterschiede kann nichts erklären und nichts messen. Nimm sie aus der Auswahl heraus.`, `Eine Spalte ohne Unterschiede kann nichts erklären und nichts messen. Nehmen Sie sie aus der Auswahl heraus.`, 'A column without differences cannot explain or measure anything. Remove it from the selection.') });
    }
    if (verfahren.id === 'gruppen' && !werte.l3.length && !werte.l4.length) {
      const g = werte.l2[0]!, gruppen = new Map<string, number>();
      const ig = idx(g), iv = idx(werte.l1[0]!);
      // Nur Personen mit gültigem Gruppen- UND gültigem Messwert zählen; eine Gruppe, die keinen einzigen gültigen Messwert hat, steht nicht in der Liste, sondern wird unten genannt
      const spG = spalteNach(g), spY = spalteNach(werte.l1[0]!), ohneWert = new Set<string>();
      const gueltigG = (v: unknown) => v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && !!istFehlend(spG, v));
      const gueltigY = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && !istFehlend(spY, v);
      for (const z of s.zeilen) { const a = z[ig], b = z[iv]; if (!gueltigG(a)) continue; const k = String(a); if (!gueltigY(b)) { ohneWert.add(k); continue; } gruppen.set(k, (gruppen.get(k) ?? 0) + 1); }
      const leereGruppen = [...ohneWert].filter(k => !gruppen.has(k));
      const liste = [...gruppen].map(([k, n]) => `${gruppenName(g, k)}: ${n}`).join(' · ');
      p.unshift({ art: 'ok', text: L(`${gruppen.size} Gruppen, jede Person in genau einer`, `${gruppen.size} groups, each person in exactly one`), klein: liste });
      p.splice(1, 0, { art: 'ok', text: L(`${name(werte.l1[0]!)} ist eine Zahl`, `${name(werte.l1[0]!)} is a number`) });
      if (leereGruppen.length) p.push({ art: 'hinweis', text: Lp(leereGruppen.length, `Eine Gruppe hat keinen gültigen Wert und fehlt im Vergleich: ${leereGruppen.map(k => gruppenName(g, k)).join(', ')}`, `Gruppen haben keinen gültigen Wert und fehlen im Vergleich: ${leereGruppen.map(k => gruppenName(g, k)).join(', ')}`, `One group has no valid value and is left out of the comparison: ${leereGruppen.map(k => gruppenName(g, k)).join(', ')}`, `Some groups have no valid value and are left out of the comparison: ${leereGruppen.map(k => gruppenName(g, k)).join(', ')}`), klein: L('Sie haben nur Angaben wie „keine Angabe“ oder leere Felder bei dieser Zahl.', 'They only have answers such as "no answer" or blank cells for this number.') });
      const klein = [...gruppen].filter(([, n]) => n < 2);
      if (klein.length) p.push({ art: gruppen.size - klein.length >= 2 ? 'hinweis' : 'sperre', text: Lp(klein.length, `Eine Gruppe hat nur 1 Person: ${klein.map(([k]) => gruppenName(g, k)).join(', ')}`, `Gruppen haben nur 1 Person: ${klein.map(([k]) => gruppenName(g, k)).join(', ')}`, `One group has only 1 person: ${klein.map(([k]) => gruppenName(g, k)).join(', ')}`, `Some groups have only 1 person: ${klein.map(([k]) => gruppenName(g, k)).join(', ')}`), klein: gruppen.size - klein.length < 2 ? d('Dann bleibt kein Vergleich übrig - ein Mittelwert braucht mindestens zwei Personen, und es müssen mindestens zwei Gruppen bleiben. Wähle eine andere Spalte für die Gruppen.', 'Dann bleibt kein Vergleich übrig - ein Mittelwert braucht mindestens zwei Personen, und es müssen mindestens zwei Gruppen bleiben. Wählen Sie eine andere Spalte für die Gruppen.', 'Then nothing is left to compare - a mean needs at least two people, and at least two groups must remain. Choose another column for the groups.') : d('Mit einer Person lässt sich kein Mittelwert vergleichen. Statable lässt diese Gruppe beim Vergleich aus - nenne das im Bericht.', 'Mit einer Person lässt sich kein Mittelwert vergleichen. Statable lässt diese Gruppe beim Vergleich aus - nennen Sie das im Bericht.', "An average can't be compared meaningfully with one person. Statable leaves this group out of the comparison - mention that in your report."), erklaer: 'voraussetzung' });
      else if (Math.min(kleinste(gruppen.values())) < 20) p.push({ art: 'hinweis', text: L('Eine Gruppe ist klein', 'One group is small'), klein: L(`Die kleinste Gruppe hat ${Math.min(kleinste(gruppen.values()))} Personen. Das Ergebnis ist dann unsicherer.`, `The smallest group has ${Math.min(kleinste(gruppen.values()))} people. The result is less certain then.`), erklaer: 'stichprobe' });
      else p.push({ art: 'ok', text: L('Genug Personen je Gruppe', 'Enough people in each group') });
      // F5 (+T64): Ob ein Rangtest besser passt, steht VOR dem Rechnen da - mit Grund (Schiefe, Ausreißer, gestufte Messgröße), keine Faustregel zur Gruppengröße.
      const rv = gruppen.size >= 2 && !klein.length ? rangVorschlagFuer('gruppen', werte.l1[0]!, g) : null;
      if (rv) p.push(rangPruefPunkt(rv, false));
    } else if (verfahren.id === 'gruppen') {
      p.unshift(...gruppen2Pruefliste());
    } else if (verfahren.id === 'zusammenhang') {
      const [a, b] = [idx(werte.l1[0]!), idx(werte.l2[0]!)];
      const n = s.zeilen.filter(z => typeof z[a] === 'number' && typeof z[b] === 'number' && !istFehlend(spalteNach(werte.l1[0]!), z[a] as number) && !istFehlend(spalteNach(werte.l2[0]!), z[b] as number)).length;
      if (!werte.l3.length) p.unshift({ art: n >= 30 ? 'ok' : 'hinweis', text: Lp(n, `${n} Person mit beiden Angaben`, `${n} Personen mit beiden Angaben`, `${n} person with both answers`, `${n} people with both answers`), klein: n < s.zeilen.length ? Lp(s.zeilen.length - n, `${s.zeilen.length - n} ohne eine der Angaben wird ausgelassen.`, `${s.zeilen.length - n} ohne eine der Angaben werden ausgelassen.`, `${s.zeilen.length - n} without one of the answers is left out.`, `${s.zeilen.length - n} without one of the answers are left out.`) : undefined });
      const emp = empfohleneKorrelation(werte.l1[0]!, werte.l2[0]!, ctx);
      p.push({ art: 'info', text: korrelationsGrundText(emp.grund, emp.methode), klein: werte.l3.length || aktivesGewicht() ? undefined : d('Im Ergebnis kannst du zwischen Pearson, Spearman und Kendall umschalten.', 'Im Ergebnis können Sie zwischen Pearson, Spearman und Kendall umschalten.', 'In the result you can switch between Pearson, Spearman and Kendall.') });
      if (!aktivesGewicht()) p.push({ art: 'info', text: L('Ob der Zusammenhang geradlinig ist, zeigt das Streudiagramm im Ergebnis.', 'The scatter plot in the result shows whether the relationship is a straight line.') });   // mit Fallgewicht ist das Streudiagramm gesperrt (Sperrtabelle)
      if (werte.l3.length) {
        const k = werte.l3.length, voll = zahlenZeilenMitLuecken([werte.l1[0]!, werte.l2[0]!, ...werte.l3]).filter(z => z.every(v => v !== null)).length;
        const doppelt = werte.l3.filter(n => n === werte.l1[0] || n === werte.l2[0]);
        if (doppelt.length) p.unshift({ art: 'sperre', text: L(`„${doppelt[0]}“ soll herausgerechnet werden, ist aber selbst Teil der Frage`, `"${doppelt[0]}" is to be controlled for but is part of the question itself`), klein: d('Wähle zum Herausrechnen andere Spalten als die beiden, deren Zusammenhang du wissen willst.', 'Wählen Sie zum Herausrechnen andere Spalten als die beiden, deren Zusammenhang Sie wissen wollen.', 'Choose other columns to control for than the two whose relationship you want.') });
        else if (voll < partialMindestPersonen(k)) p.unshift({ art: 'sperre', text: L(`Zu wenige Personen: ${voll} mit allen Angaben, nötig sind mindestens ${partialMindestPersonen(k)}`, `Not enough people: ${voll} with all answers, at least ${partialMindestPersonen(k)} needed`), klein: L('Mit so wenigen Personen lässt sich der Zusammenhang nach dem Herausrechnen nicht sinnvoll berechnen.', 'With so few people the relationship cannot be calculated meaningfully after controlling.') });
        else p.unshift({ art: voll >= 30 ? 'ok' : 'hinweis', text: L(`Herausgerechnet: ${aufzaehlung(werte.l3.map(n => name(n)))} (${voll} Personen mit allen Angaben)`, `Controlled for: ${aufzaehlung(werte.l3.map(n => name(n)))} (${voll} people with all answers)`), klein: d('Statable rechnet die Partialkorrelation selbst; es zählen nur Personen, die bei allen beteiligten Spalten eine Zahl haben. Im Ergebnis kannst du zwischen Pearson und Spearman umschalten.', 'Statable rechnet die Partialkorrelation selbst; es zählen nur Personen, die bei allen beteiligten Spalten eine Zahl haben. Im Ergebnis können Sie zwischen Pearson und Spearman umschalten.', 'Statable calculates the partial correlation itself; only people with a number in all columns involved count. In the result you can switch between Pearson and Spearman.') });
      }
    } else if (jaNeinFall(verfahren, werte)) {
      p.unshift(...jaNeinPruefliste());
    } else if (verfahren.id === 'praepost') {
      const n = zahlenPaare(werte.l1[0]!, werte.l2[0]!).length;
      if (werte.l1[0] === werte.l2[0]) p.unshift({ art: 'sperre', text: L('Vorher und nachher sind dieselbe Spalte', 'Before and after are the same column'), klein: d('Wähle zwei verschiedene Spalten - die erste Messung und die zweite.', 'Wählen Sie zwei verschiedene Spalten - die erste Messung und die zweite.', 'Choose two different columns - the first measurement and the second.') });
      p.unshift({ art: n >= 20 ? 'ok' : 'hinweis', text: Lp(n, `${n} Person mit beiden Messungen`, `${n} Personen mit beiden Messungen`, `${n} person with both measurements`, `${n} people with both measurements`), klein: n < s.zeilen.length ? Lp(s.zeilen.length - n, `${s.zeilen.length - n} ohne eine der beiden Angaben wird ausgelassen.`, `${s.zeilen.length - n} ohne eine der beiden Angaben werden ausgelassen.`, `${s.zeilen.length - n} without one of the two answers is left out.`, `${s.zeilen.length - n} without one of the two answers are left out.`) : (n < 20 ? L('Bei wenigen Personen ist das Ergebnis unsicherer.', 'With few people the result is less certain.') : undefined) });
      const rvp = werte.l1[0] !== werte.l2[0] ? rangVorschlagFuer('prae-post', werte.l1[0]!, werte.l2[0]!) : null;
      if (rvp) p.push(rangPruefPunkt(rvp, true));
      p.push({ art: 'info', text: L('Kann Statable nicht prüfen: Sind „vorher“ und „nachher“ wirklich dieselben Personen, in derselben Zeile?', "Statable can't check this: are \"before\" and \"after\" really the same people, in the same row?"), klein: L('Jede Zeile der Daten muss eine Person sein.', 'Each row of the data must be one person.') });
    } else if (verfahren.id === 'uebereinstimmung' && uebereinstimmungsArt(werte.l1, ctx, uebWunsch ?? undefined).art === 'inter') {
      const z = zaehleEinheiten(kodierungen(werte.l1)), viele = kappaZuVieleStufen(werte.l1, ctx, uebWunsch ?? undefined);
      p.unshift({ art: 'info', text: L("Statable rechnet Fleiss' Kappa und Krippendorffs Alpha", "Statable calculates Fleiss' kappa and Krippendorff's alpha"), klein: L(`${werte.l1.length} Spalten mit Kategorien (Gruppen, Stufen, Codes), eine je Kodierende. Fehlende Kodierungen sind erlaubt. Die Skala für Alpha folgt dem Messniveau der Spalten (änderbar unter „Spalten beschreiben“): ${skalaName(interSkala(werte.l1))}.`, `${werte.l1.length} columns with categories (groups, levels, codes), one per coder. Missing codings are allowed. The scale for alpha follows the level of measurement of the columns (can be changed under "Describe columns"): ${skalaName(interSkala(werte.l1))}.`) });
      if (viele) p.unshift({ art: 'hinweis', text: L(`Sehr viele verschiedene Werte (bis zu ${viele}) - Kappa passt hier schlecht`, `Very many different values (up to ${viele}) - kappa fits poorly here`), klein: d(`Fleiss' Kappa zählt nur, wie oft Kodierende genau denselben Wert vergeben. Bei Punktwerten passt der ICC; für Noten oder Stufen fasse die Werte vorher zusammen (höchstens ${KAPPA_STUFEN_MAX} Stufen).`, `Fleiss' Kappa zählt nur, wie oft Kodierende genau denselben Wert vergeben. Bei Punktwerten passt der ICC; für Noten oder Stufen fassen Sie die Werte vorher zusammen (höchstens ${KAPPA_STUFEN_MAX} Stufen).`, `Fleiss' kappa only counts how often coders give exactly the same value. For point scores the ICC fits; for grades or levels group the values first (at most ${KAPPA_STUFEN_MAX} levels).`) });
      if (z.mind2 < 3) p.unshift({ art: 'sperre', text: L(`Zu wenige Einheiten: ${z.mind2} mit mindestens zwei Kodierungen, nötig sind mindestens 3`, `Not enough units: ${z.mind2} with at least two codings, at least 3 needed`), klein: L('Mit so wenigen Einheiten lässt sich keine Übereinstimmung berechnen.', 'With so few units no agreement can be calculated.') });
      else {
        p.unshift({ art: z.mind2 >= 30 ? 'ok' : 'hinweis', text: Lp(z.mind2, `${z.mind2} Einheit mit mindestens zwei Kodierungen`, `${z.mind2} Einheiten mit mindestens zwei Kodierungen`, `${z.mind2} unit with at least two codings`, `${z.mind2} units with at least two codings`), klein: (z.eine > 0 ? Lp(z.eine, `${z.eine} Einheit mit nur einer Kodierung zählt für Alpha nicht. `, `${z.eine} Einheiten mit nur einer Kodierung zählen für Alpha nicht. `, `${z.eine} unit with only one coding does not count for alpha. `, `${z.eine} units with only one coding do not count for alpha. `) : '') + (z.mind2 < 30 ? L('Bei wenigen Einheiten ist das Konfidenzintervall breit.', 'With few units the confidence interval is wide.') : ''), erklaer: z.mind2 < 30 ? 'stichprobe' : undefined });
        if (z.kategorien < 2) p.unshift({ art: 'hinweis', text: L('Alle Kodierungen sind gleich', 'All codings are the same'), klein: L('Die Übereinstimmung beträgt 100 %. Fleiss\' Kappa und Alpha lassen sich dann nicht berechnen; das Blatt sagt das in einem Satz.', 'The agreement is 100%. Fleiss\' kappa and alpha cannot be calculated then; the page says so in one sentence.') });
      }
      p.push({ art: 'info', text: L('Kann Statable nicht prüfen: Haben die Kodierenden unabhängig voneinander kodiert - dieselben Einheiten, je Einheit eine Zeile?', "Statable can't check this: did the coders code independently - the same units, one row per unit?"), klein: L('Jede Zeile der Daten muss eine Einheit sein (Textstelle, Antwort), jede Kodierende eine Spalte.', 'Each row of the data must be one unit (text passage, answer), each coder one column.') });
    } else if (verfahren.id === 'uebereinstimmung') {
      const ua = uebereinstimmungsArt(werte.l1, ctx, uebWunsch ?? undefined), voll = vollstaendig(werte.l1), n = voll.length;
      if (ua.art === 'unklar') p.unshift({ art: 'sperre', text: L('Diese Spalten passen nicht zusammen', 'These columns do not fit together'), klein: d("Cohens Kappa rechnet Statable für zwei Spalten mit Kategorien, Fleiss' Kappa und Krippendorffs Alpha für drei oder mehr Spalten mit Kategorien, den ICC für Spalten mit Zahlen. Wähle entweder nur Spalten mit Kategorien oder nur Zahlenspalten.", "Cohens Kappa rechnet Statable für zwei Spalten mit Kategorien, Fleiss' Kappa und Krippendorffs Alpha für drei oder mehr Spalten mit Kategorien, den ICC für Spalten mit Zahlen. Wählen Sie entweder nur Spalten mit Kategorien oder nur Zahlenspalten.", "Statable calculates Cohen's kappa for two columns with categories, Fleiss' kappa and Krippendorff's alpha for three or more columns with categories, and the ICC for columns with numbers. Choose either only columns with categories or only number columns.") });
      else p.unshift({ art: 'info', text: ua.art === 'kappa' ? L('Statable rechnet Cohens Kappa', 'Statable calculates Cohen\'s kappa') : L('Statable rechnet den ICC', 'Statable calculates the ICC'), klein: ua.art === 'kappa'
        ? (werte.l1.every(n => ctx.istZahl(n)) && !ua.kategorial ? L('Zwei Spalten, aber mit vielen verschiedenen Werten - hier zählt, wie oft beide genau gleich urteilen. Für Punktwerte passt der ICC besser (Auswahl unten).', 'Two columns, but with many different values - this counts how often both give exactly the same rating. For point scores the ICC fits better (choice below).')
          : L('Zwei Spalten mit Kategorien (Gruppen, Stufen, Noten).', 'Two columns with categories (groups, levels, grades).'))
        : (werte.l1.length === 2 && ua.kategorial ? L('Zahlen mit wenigen Stufen - der ICC passt, wenn die Abstände zwischen den Stufen etwas bedeuten (Auswahl unten).', 'Numbers with few levels - the ICC fits if the distances between levels mean something (choice below).')
          : L(`${werte.l1.length} Spalten mit Zahlen - eine je Beurteilende.`, `${werte.l1.length} columns with numbers - one per rater.`)) });
      if (n < 3) p.unshift({ art: 'sperre', text: L(`Zu wenige Fälle: ${n} mit allen Angaben, nötig sind mindestens 3`, `Not enough cases: ${n} with all ratings, at least 3 needed`), klein: L('Mit so wenigen Fällen lässt sich keine Übereinstimmung berechnen.', 'With so few cases no agreement can be calculated.') });
      else {
        const aus = s.zeilen.length - n;
        p.unshift({ art: n >= 30 ? 'ok' : 'hinweis', text: Lp(n, `${n} Fall mit allen Urteilen`, `${n} Fälle mit allen Urteilen`, `${n} case with all ratings`, `${n} cases with all ratings`), klein: (aus > 0 ? Lp(aus, `${aus} unvollständige Zeile wird ausgelassen. `, `${aus} unvollständige Zeilen werden ausgelassen. `, `${aus} incomplete row is left out. `, `${aus} incomplete rows are left out. `) : '') + (n < 30 ? L('Bei wenigen Fällen ist das Konfidenzintervall breit; Koo & Li empfehlen mindestens 30.', 'With few cases the confidence interval is wide; Koo & Li recommend at least 30.') : ''), erklaer: n < 30 ? 'stichprobe' : undefined });
        const viele = kappaZuVieleStufen(werte.l1, ctx, uebWunsch ?? undefined);
        if (viele) p.unshift({ art: 'hinweis', text: L(`Sehr viele verschiedene Werte (bis zu ${viele}) - Kappa passt hier schlecht`, `Very many different values (up to ${viele}) - kappa fits poorly here`), klein: L(`Kappa zählt nur, wie oft beide genau denselben Wert vergeben. Bei Punktwerten ist das fast nie der Fall (Kappa nahe 0), und die Rechnung kann sehr lange dauern. Für Punktwerte passt der ICC; für Noten oder Stufen fasse die Werte vorher zusammen (höchstens ${KAPPA_STUFEN_MAX} Stufen).`, `Kappa only counts how often both give exactly the same value. With point scores that almost never happens (kappa near 0), and the calculation can take very long. For point scores the ICC fits; for grades or levels group the values first (at most ${KAPPA_STUFEN_MAX} levels).`) });
        if (ua.art === 'kappa' && new Set(voll.flat()).size < 2) p.unshift({ art: 'sperre', text: L('Alle vergeben denselben Wert', 'Everyone gives the same value'), klein: L('Mit nur einer Kategorie gibt es nichts zu vergleichen.', 'With only one category there is nothing to compare.') });
      }
      p.push({ art: 'info', text: L('Kann Statable nicht prüfen: Haben die Beurteilenden unabhängig voneinander beurteilt - dieselben Fälle, je Fall eine Zeile?', "Statable can't check this: did the raters judge independently - the same cases, one row per case?"), klein: L('Jede Zeile der Daten muss ein Fall sein, jede Beurteilende eine Spalte.', 'Each row of the data must be one case, each rater one column.') });
    } else if (verfahren.id === 'messwiederholung') {
      const k = werte.l1.length, g = werte.l2.length ? ctx.verschieden(werte.l2[0]!) : 1, voll = vollstaendig([...werte.l1, ...werte.l2]), n = voll.length, aus = s.zeilen.length - n;
      if (werte.l1.some(x => ctx.binaer?.(x))) p.unshift({ art: 'sperre', text: L('Ja/Nein-Spalten und Zahlenspalten passen nicht zusammen', 'Yes/no columns and number columns do not fit together'), klein: d('Wähle entweder nur Spalten mit Ja/Nein (Cochran-Q) oder nur Spalten mit Zahlen (Varianzanalyse, Friedman-Test).', 'Wählen Sie entweder nur Spalten mit Ja/Nein (Cochran-Q) oder nur Spalten mit Zahlen (Varianzanalyse, Friedman-Test).', 'Choose either only yes/no columns (Cochran\'s Q) or only number columns (analysis of variance, Friedman test).') });
      if (werte.l2[0] && werte.l1.includes(werte.l2[0])) p.unshift({ art: 'sperre', text: L('Die Gruppenspalte ist auch ein Zeitpunkt', 'The group column is also a time point'), klein: d('Wähle als Gruppen eine andere Spalte oder gar keine.', 'Wählen Sie als Gruppen eine andere Spalte oder gar keine.', 'Choose another column for the groups, or none.') });
      if (n < mindestPersonen(k, g)) p.unshift({ art: 'sperre', text: L(`Zu wenige Personen: ${n} mit allen ${k} Messungen, nötig sind mindestens ${mindestPersonen(k, g)}`, `Not enough people: ${n} with all ${k} measurements, at least ${mindestPersonen(k, g)} needed`), klein: L('Mit so wenigen Personen lässt sich die Sphärizität nicht prüfen.', 'With so few people sphericity cannot be checked.') });
      else {
        p.unshift({ art: n >= 20 ? 'ok' : 'hinweis', text: Lp(n, `${n} Person mit allen ${k} Messungen`, `${n} Personen mit allen ${k} Messungen`, `${n} person with all ${k} measurements`, `${n} people with all ${k} measurements`), klein: (aus > 0 ? Lp(aus, `${aus} Zeile mit einer Lücke wird ausgelassen. `, `${aus} Zeilen mit Lücken werden ausgelassen. `, `${aus} row with a gap is left out. `, `${aus} rows with gaps are left out. `) : '') + (n < 20 ? L('Bei weniger als 20 Personen ist das Ergebnis unsicherer.', 'With fewer than 20 people the result is less certain.') : '') });
        if (werte.l2[0]) {
          const zaehl = new Map<string | number, number>(); for (const z of voll) zaehl.set(z[k]!, (zaehl.get(z[k]!) ?? 0) + 1);
          const klein = [...zaehl.values()].reduce((a, b) => Math.min(a, b), Infinity), liste = [...zaehl].map(([x, c]) => `${gruppenName(werte.l2[0]!, x)}: ${c}`).join(' · ');
          p.splice(1, 0, { art: klein < 2 ? 'sperre' : klein < 5 ? 'hinweis' : 'ok', text: L(`${zaehl.size} Gruppen, jede Person in genau einer`, `${zaehl.size} groups, each person in exactly one`), klein: liste + (klein < 2 ? L(' - eine Gruppe hat nur 1 Person.', ' - one group has only 1 person.') : klein < 5 ? L(' - sehr kleine Gruppen machen die Prüfung der Sphärizität unsicher.', ' - very small groups make the check of sphericity uncertain.') : '') });
        }
      }
      // G5: Ob der Friedman-Test besser passt, steht wie bei den anderen Rangtests VOR dem Rechnen da (Gruppen kennt er nicht).
      if (!werte.l2[0] && !werte.l1.some(x => ctx.binaer?.(x))) { const rv = rangVorschlagMw(werte.l1); if (rv) p.push(rangPruefPunkt(rv, 'mw')); }
      p.push({ art: 'info', text: L(`Zeitliche Reihenfolge: ${werte.l1.map(n => name(n)).join(' ' + pfeil() + ' ')}`, `Time order: ${werte.l1.map(n => name(n)).join(' ' + pfeil() + ' ')}`), klein: d('Stimmt die Reihenfolge nicht, ändere die Auswahl oben. Die Zeitpunkte gelten als gleich weit auseinander; der Zeitabstand fließt nicht ein.', 'Stimmt die Reihenfolge nicht, ändern Sie die Auswahl oben. Die Zeitpunkte gelten als gleich weit auseinander; der Zeitabstand fließt nicht ein.', 'If the order is wrong, change the selection above. The time points are treated as equally spaced; the actual interval is not used.') });
      p.push({ art: 'info', text: L('Kann Statable nicht prüfen: Sind alle Spalten dieselbe Messung auf derselben Skala, von denselben Personen in derselben Zeile?', "Statable can't check this: are all columns the same measurement on the same scale, from the same people in the same row?"), klein: L('Die Sphärizität (gleiche Streuung aller Zeitpunkt-Differenzen) prüft Statable im Ergebnis und korrigiert bei Bedarf.', 'Statable checks sphericity (equal spread of all differences between time points) in the result and corrects if needed.') });
    } else if (verfahren.id === 'mediation' && prozessModell !== 4) {
      p.push(...prozessPunkte());
    } else if (verfahren.id === 'mediation' || verfahren.id === 'moderation') {
      const [x, y, m] = [werte.l1[0]!, werte.l2[0]!, werte.l3[0]!], voll = vollstaendig([x, y, m]), n = voll.length, aus = s.zeilen.length - n, med = verfahren.id === 'mediation';
      if (med && werte.l4[0]) p.push({ art: 'info', text: L('Die vierte Größe wird nicht verwendet', 'The fourth variable is not used'), klein: d('Es ist die einfache Mediation gewählt. Wähle unter „Weitere Wege“ ein anderes Modell, damit sie zählt.', 'Es ist die einfache Mediation gewählt. Wählen Sie unter „Weitere Wege“ ein anderes Modell, damit sie zählt.', 'The simple mediation is chosen. Choose another model under "More options" for it to count.') });
      if (new Set([x, y, m]).size < 3) p.unshift({ art: 'sperre', text: L('Eine Spalte steht mehrfach', 'A column is used more than once'), klein: d('Wähle für die drei Lücken drei verschiedene Spalten.', 'Wählen Sie für die drei Lücken drei verschiedene Spalten.', 'Choose three different columns for the three blanks.') });
      else if (n < 10) p.unshift({ art: 'sperre', text: L(`Zu wenige Personen: ${n} mit allen drei Angaben, nötig sind mindestens 10`, `Not enough people: ${n} with all three answers, at least 10 needed`), klein: L('Mit so wenigen Personen lässt sich das nicht sinnvoll rechnen.', 'With so few people this cannot be calculated meaningfully.') });
      else {
        const konst = [x, y, m].filter((nm, k) => new Set(voll.map(z => z[k])).size < 2);
        if (konst.length) p.unshift({ art: 'sperre', text: L(`${konst.map(name).join(', ')}: alle haben denselben Wert`, `${konst.map(name).join(', ')}: everyone has the same value`), klein: L('Ohne Unterschiede zwischen den Personen lässt sich nichts berechnen.', 'Without differences between people nothing can be calculated.') });
        p.unshift({ art: n >= 50 ? 'ok' : 'hinweis', text: Lp(n, `${n} Person mit allen drei Angaben`, `${n} Personen mit allen drei Angaben`, `${n} person with all three answers`, `${n} people with all three answers`),
          klein: (aus > 0 ? Lp(aus, `${aus} Zeile mit einer Lücke wird ausgelassen. `, `${aus} Zeilen mit Lücken werden ausgelassen. `, `${aus} row with a gap is left out. `, `${aus} rows with gaps are left out. `) : '') + (n < 50 ? (med ? L('Bei wenigen Personen ist das Bootstrap-Intervall ungenau; ab etwa 50 wird es verlässlich.', 'With few people the bootstrap interval is imprecise; from about 50 it becomes reliable.') : L('Wechselwirkungen brauchen viele Personen, um entdeckt zu werden; unter 50 ist das Ergebnis sehr unsicher.', 'Interactions need many people to be detected; below 50 the result is very uncertain.')) : '') });
        if (!med && new Set(voll.map(z => z[2])).size === 2) p.push({ art: 'info', text: L(`${name(m)} hat zwei Werte`, `${name(m)} has two values`), klein: L('Statable zeigt dann die Steigung bei beiden Werten statt bei Mittelwert ± 1 Standardabweichung.', 'Statable then shows the slope at both values instead of at the mean ± 1 standard deviation.') });
        if (med && new Set(voll.map(z => z[0])).size === 2) p.push({ art: 'info', text: L(`${name(x)} hat zwei Werte`, `${name(x)} has two values`), klein: L('Die Pfade zeigen dann den Unterschied zwischen den beiden Werten (bei Kodierung 0 und 1: zwischen den Gruppen).', 'The paths then show the difference between the two values (with coding 0 and 1: between the groups).') });
      }
      p.push(med
        ? { art: 'info', text: L('Kann Statable nicht prüfen: Liegt der Zwischenschritt zeitlich und inhaltlich wirklich zwischen den beiden anderen?', "Statable can't check this: does the intermediate step really lie between the other two, in time and in content?"), klein: L('Mit Daten aus einer einzigen Befragung belegt eine Mediation keine Kausalität; die Richtung X → M → Y ist eine Annahme aus der Theorie.', 'With data from a single survey, a mediation does not establish causality; the direction X → M → Y is an assumption from theory.') }
        : { art: 'info', text: L('Statable zentriert die Zahlen am Mittelwert', 'Statable centers the numbers at the mean'), klein: L('Die Einzeleffekte gelten dann beim Mittelwert der anderen Größe; die Wechselwirkung selbst bleibt gleich.', 'The main effects then hold at the mean of the other variable; the interaction itself stays the same.') });
    } else if (verfahren.id === 'einzelfall') {
      const spalten4 = [werte.l1[0]!, werte.l2[0]!, werte.l3[0], werte.l4[0]].filter((x): x is string => !!x);
      if (new Set(spalten4).size < spalten4.length) p.unshift({ art: 'sperre', text: L('Eine Spalte steht mehrfach', 'A column is used more than once'), klein: L('Messwert, Phase, Messzeitpunkt und Fall müssen vier verschiedene Spalten sein.', 'Measure, phase, occasion and case must be four different columns.') });
      else {
        const au = baueFaelle(einzelfallZeilen(werte), String, v => gruppenName(werte.l4[0]!, v)), nF = au.faelle.length;
        const nm = (f: { name: string }, i: number) => f.name || (nF > 1 ? L(`Fall ${i + 1}`, `Case ${i + 1}`) : '');
        if (!nF) p.unshift({ art: 'sperre', text: L('Keine Messung mit Wert und Phase', 'No measurement with a value and a phase'), klein: L('Es fehlen Messwerte oder Angaben zur Phase.', 'Values or phase information are missing.') });
        else if (!au.phasenB) p.unshift({ art: 'sperre', text: L('Es kommt nur eine Phase vor', 'Only one phase occurs'), klein: L('Gebraucht werden Messungen aus Phase A (Ausgangslage) und aus Phase B (Förderung).', 'Measurements from phase A (baseline) and phase B (intervention) are needed.') });
        else {
          const leer = au.ohnePhase.map((x, i) => x || L(`Fall ${i + 1}`, `Case ${i + 1}`));
          if (leer.length) p.unshift({ art: 'sperre', text: Lp(leer.length, `Ein Fall hat nur eine Phase: ${leer.slice(0, 4).join(', ')}`, `${leer.length} Fälle haben nur eine Phase: ${leer.slice(0, 4).join(', ')}`, `One case has only one phase: ${leer.slice(0, 4).join(', ')}`, `${leer.length} cases have only one phase: ${leer.slice(0, 4).join(', ')}`), klein: L('Jeder Fall braucht Messungen in A und in B.', 'Every case needs measurements in A and in B.') });
          else if (au.wechselt.length) p.unshift({ art: 'sperre', text: L('Die Phasen folgen nicht auf A erst, dann B', 'The phases do not run A first, then B'), klein: d(`${au.wechselt.map(x => x || L('Der Fall', 'The case')).slice(0, 3).join(', ')}: Die Phasen wechseln mehrfach oder beginnen mit B. Statable rechnet nur das A-B-Design (erst alle Messungen der Ausgangslage, dann alle der Förderung), A-B-A-B noch nicht. Stimmt nur die Reihenfolge der Zeilen nicht, gib eine Spalte für den Messzeitpunkt an. Sonst nimm diesen Fall heraus oder teile ihn in eigene A-B-Abschnitte.`, `${au.wechselt.map(x => x || L('Der Fall', 'The case')).slice(0, 3).join(', ')}: Die Phasen wechseln mehrfach oder beginnen mit B. Statable rechnet nur das A-B-Design (erst alle Messungen der Ausgangslage, dann alle der Förderung), A-B-A-B noch nicht. Stimmt nur die Reihenfolge der Zeilen nicht, geben Sie eine Spalte für den Messzeitpunkt an. Sonst nehmen Sie diesen Fall heraus oder teilen Sie ihn in eigene A-B-Abschnitte.`, `${au.wechselt.map(x => x || L('Der Fall', 'The case')).slice(0, 3).join(', ')}: the phases change several times or start with B. Statable only calculates the A-B design (first all baseline measurements, then all intervention measurements), not yet A-B-A-B. If only the row order is wrong, give a column for the measurement occasion. Otherwise leave this case out or split it into separate A-B sections.`) });
          else {
            p.unshift({ art: 'ok', text: L(`Phase A (Ausgangslage): „${gruppenName(werte.l2[0]!, au.phasenA)}“ · Phase B (Förderung): „${gruppenName(werte.l2[0]!, au.phasenB)}“`, `Phase A (baseline): "${gruppenName(werte.l2[0]!, au.phasenA)}" · phase B (intervention): "${gruppenName(werte.l2[0]!, au.phasenB)}"`), klein: L('Als Ausgangslage nimmt Statable die Phase, die in der Zeitfolge zuerst kommt.', 'Statable takes the phase that comes first in time as the baseline.') });
            const zeigen = au.faelle.map((f, i) => `${nm(f, i) ? nm(f, i) + ': ' : ''}${f.istB.filter(x => !x).length} + ${f.istB.filter(x => x).length}`);
            const minimum = Math.min(kleinste(au.faelle.flatMap(f => [f.istB.filter(x => !x).length, f.istB.filter(x => x).length])));
            p.splice(1, 0, { art: minimum >= 5 ? 'ok' : minimum >= 3 ? 'info' : 'hinweis', text: nF > 1 ? L(`${nF} Fälle, Messungen in A + B: ${zeigen.slice(0, 4).join(' · ')}${nF > 4 ? ' …' : ''}`, `${nF} cases, measurements in A + B: ${zeigen.slice(0, 4).join(' · ')}${nF > 4 ? ' …' : ''}`) : L(`Messungen in A + B: ${zeigen[0]}`, `Measurements in A + B: ${zeigen[0]}`),
              klein: minimum >= 5 ? L('Mindestens 5 Messpunkte je Phase: Das empfehlen die What Works Clearinghouse-Standards.', 'At least 5 data points per phase: this is what the What Works Clearinghouse standards recommend.') : minimum >= 3 ? L('Mindestens 3 Messpunkte je Phase sind erfüllt (What Works Clearinghouse); 5 oder mehr sind besser.', 'The minimum of 3 data points per phase is met (What Works Clearinghouse); 5 or more is better.') : L('Weniger als 3 Messpunkte in einer Phase: Die Kennwerte sind kaum belastbar (What Works Clearinghouse: mindestens 3, besser 5).', 'Fewer than 3 data points in a phase: the indices are hardly reliable (What Works Clearinghouse: at least 3, preferably 5).') });
          }
        }
        if (au.ausgelassen > 0) p.push({ art: 'info', text: Lp(au.ausgelassen, `${au.ausgelassen} Zeile ohne Messwert oder Phase wird ausgelassen`, `${au.ausgelassen} Zeilen ohne Messwert oder Phase werden ausgelassen`, `${au.ausgelassen} row without a value or phase is left out`, `${au.ausgelassen} rows without a value or phase are left out`) });
        p.push({ art: 'info', text: werte.l3[0] ? L(`Reihenfolge nach ${name(werte.l3[0])}`, `Order by ${name(werte.l3[0])}`) : L('Die Reihenfolge der Zeilen gilt als Reihenfolge der Messungen', 'The order of the rows counts as the order of the measurements'), klein: werte.l3[0] ? L('Die Abstände zwischen den Messzeitpunkten gelten als gleich; nur die Reihenfolge fließt ein.', 'The intervals between the occasions count as equal; only the order matters.') : d('Stehen die Zeilen nicht in zeitlicher Folge, gib oben eine Spalte für den Messzeitpunkt an.', 'Stehen die Zeilen nicht in zeitlicher Folge, geben Sie oben eine Spalte für den Messzeitpunkt an.', 'If the rows are not in time order, give a column for the measurement occasion above.') });
        p.push({ art: 'info', text: L('Kann Statable nicht prüfen: Wurde in beiden Phasen gleich gemessen (gleiche Aufgabe, Dauer und Bedingungen)?', "Statable can't check this: was the measurement the same in both phases (same task, duration and conditions)?"), klein: L('Nur dann sind A und B vergleichbar.', 'Only then are A and B comparable.') });
        p.push({ art: 'info', text: L('Statable nimmt an: höher ist besser', 'Statable assumes: higher is better'), klein: d('Zählt ein niedrigerer Wert als besser (zum Beispiel Fehler), schaltest du im Ergebnis die Richtung um.', 'Zählt ein niedrigerer Wert als besser (zum Beispiel Fehler), schalten Sie im Ergebnis die Richtung um.', 'If a lower value counts as better (for example errors), switch the direction in the result.') });
      }
    } else if (verfahren.id === 'faelle') {
      p.push(...faellePruefliste(werte, s.zeilen.length, () => faelleAusDaten(werte)));   // Welle 4, G1: Text und Logik in lib/faellesaetze.ts
    } else if (verfahren.id === 'kaplanmeier') {
      const spalten3 = [werte.l1[0]!, werte.l2[0]!, werte.l3[0]].filter((x): x is string => !!x);
      const kd = kaplanDaten(werte), ev = kmVorschau;
      if (new Set(spalten3).size < spalten3.length) p.unshift({ art: 'sperre', text: L('Eine Spalte steht mehrfach', 'A column is used more than once'), klein: L('Zeit, Ereignis und Gruppe müssen verschiedene Spalten sein.', 'Time, event and group must be different columns.') });
      else if (kd.negativ) p.unshift({ art: 'sperre', text: Lp(kd.negativ, `${name(werte.l1[0]!)}: ${kd.negativ} negative Zeit`, `${name(werte.l1[0]!)}: ${kd.negativ} negative Zeiten`, `${name(werte.l1[0]!)}: ${kd.negativ} negative time`, `${name(werte.l1[0]!)}: ${kd.negativ} negative times`), klein: d('Eine Beobachtungszeit kann nicht negativ sein. Prüfe die Spalte (oder setze „keine Angabe“-Werte wie -99 als fehlend).', 'Eine Beobachtungszeit kann nicht negativ sein. Prüfen Sie die Spalte (oder setzen Sie „keine Angabe“-Werte wie -99 als fehlend).', 'An observation time cannot be negative. Check the column (or mark codes such as -99 as missing).') });
      else if (kd.statusWerte.length === 0) p.unshift({ art: 'sperre', text: L(`${name(werte.l2[0]!)}: keine Werte übrig`, `${name(werte.l2[0]!)}: no values left`), klein: L('Keine Zeile hat zugleich eine Zeit und eine Angabe zum Ereignis.', 'No row has both a time and an entry for the event.') });
      else if (kd.statusWerte.length === 1 && einWertArt(kd.statusWerte[0]!).art === 'zensiert') {
        const wt = kd.statusWerte[0]!.text;
        p.unshift({ art: 'sperre', text: L(`${name(werte.l2[0]!)} hat nur den Wert „${wt}“: alle zensiert`, `${name(werte.l2[0]!)} has only the value "${wt}": everyone censored`),
          klein: L(`„${wt}“ heißt hier: Das Ereignis ist bei niemandem eingetreten. Dann bleibt die Kurve bei 100 % - es lässt sich keine Zeit bis zum Ereignis schätzen, kein Median und kein Vergleich von Gruppen. Steht „${wt}“ doch für das Ereignis, die Spalte umkodieren (zum Beispiel 1 = Ereignis).`, `"${wt}" means here: the event occurred for nobody. The curve then stays at 100% - no time to the event, no median and no comparison of groups can be estimated. If "${wt}" does stand for the event, recode the column (for example 1 = event).`) });
      }
      else if (ev) {
        const g = ev.gruppen.length >= 2 ? ev.gruppen : [ev.gesamt];
        if (ev.gesamt.ereignisse === 0) p.unshift({ art: 'sperre', text: L(`Bei niemandem tritt das Ereignis („${ereignisWort(ev)}“) ein`, `The event ("${ereignisWort(ev)}") occurs for nobody`), klein: d('Ohne Ereignis gibt es keine Überlebenskurve. Schalte um, welcher Wert das Ereignis ist, wenn die Zuordnung nicht stimmt.', 'Ohne Ereignis gibt es keine Überlebenskurve. Schalten Sie um, welcher Wert das Ereignis ist, wenn die Zuordnung nicht stimmt.', 'Without an event there is no survival curve. Switch which value is the event if the assignment is wrong.') });
        else {
          p.unshift({ art: 'ok', text: L(`${ev.gesamt.n} Personen: ${ev.gesamt.ereignisse} mit Ereignis, ${ev.gesamt.zensiert} zensiert${ev.gruppen.length >= 2 ? ` (${ev.gruppen.length} Gruppen)` : ''}`, `${ev.gesamt.n} people: ${ev.gesamt.ereignisse} with the event, ${ev.gesamt.zensiert} censored${ev.gruppen.length >= 2 ? ` (${ev.gruppen.length} groups)` : ''}`), klein: ev.gruppen.length >= 2 ? g.map(x => `${x.name}: ${x.n} (${x.ereignisse})`).join(' · ') : undefined });
          for (const h of kaplanHinweise(ev)) p.push({ art: h.art, text: h.text, klein: h.klein });
        }
        if (sterbeAn) {   // Später S-F (A): Sterbetafel - JavaScript rechnet; die Wahl der Intervalle prüfen
          const b = zahlFeld(ueb.sterbe.breite), en = zahlFeld(ueb.sterbe.ende);
          const st = sterbetafelAusKaplan(ev, { breite: b, ende: en, einheit: ueb.sterbe.einheit });
          if ('fehler' in st) p.unshift({ art: 'sperre', text: sterbetafelFehlerSatz(st.fehler) });
          else p.push({ art: 'ok', text: Lp(st.anfaenge.length, `Sterbetafel mit ${st.anfaenge.length} Intervall (Breite ${komma(st.breite, Number.isInteger(st.breite) ? 0 : 2)})`, `Sterbetafel mit ${st.anfaenge.length} Intervallen (Breite ${komma(st.breite, Number.isInteger(st.breite) ? 0 : 2)})`, `Life table with ${st.anfaenge.length} interval (width ${komma(st.breite, Number.isInteger(st.breite) ? 0 : 2)})`, `Life table with ${st.anfaenge.length} intervals (width ${komma(st.breite, Number.isInteger(st.breite) ? 0 : 2)})`), klein: L('Das letzte Intervall ist offen. Statable rechnet die Tafel selbst (JavaScript), nach dem Algorithmus von SPSS (SURVIVAL).', 'The last interval is open. Statable calculates the table itself (JavaScript), after the algorithm of SPSS (SURVIVAL).') });
          if (!('fehler' in st)) for (const h of sterbetafelHinweise(st)) if (h.art === 'hinweis') p.push({ art: 'hinweis', text: h.text, klein: h.klein });
        }
        if (werte.l4.length && coxZeitAn) {   // Später S-F (A): Cox mit zeitabhängiger Größe (R, survival), Tabelle in Intervall-Form
          const ew = ev.einWert ? null : kd.statusWerte[ev.ereignisIndex]?.schluessel ?? null;
          for (const x of coxZeitPunkte(kzSpalten, werte.l4, s.spalten, ueb.zeit.start && ueb.zeit.kennung && werte.l4.includes(ueb.zeit.wert) ? coxZeitVorbereiten(s.zeilen, s.spalten, kzSpalten, ew) : null, name)) p.push(x.art === 'sperre' ? { art: 'sperre', text: x.text, klein: x.klein } : x);
        } else if (werte.l4.length) {
          // Welle 7, M1: Cox-Regression (R, survival) - Spalten ohne Unterschied sperren, wenige Ereignisse melden (Peduzzi et al. 1995)
          const konstant1 = werte.l4.filter(n => ctx.verschieden(n) < 2);
          if (konstant1.length) p.unshift({ art: 'sperre', text: Lp(konstant1.length, `${konstant1.map(name).join(', ')} hat nur einen Wert`, `${konstant1.map(name).join(', ')} haben nur einen Wert`, `${konstant1.map(name).join(', ')} has only one value`, `${konstant1.map(name).join(', ')} have only one value`), klein: L('Eine Spalte ohne Unterschied kann das Risiko nicht erklären. Für die Cox-Regression diese Spalte herausnehmen.', 'A column without differences cannot explain the risk. Leave this column out of the Cox regression.') });
          const cb = coxBefunde(ev.gesamt.ereignisse, coxDaten(werte.l1[0]!, werte.l2[0]!, null, werte.l4, s.zeilen, s.spalten).praed);
          for (const b of cb) p.push({ art: b.art === 'sperre' ? 'sperre' : 'hinweis', text: b.text, klein: b.klein });
          p.push({ art: 'info', text: L('Cox-Regression: R wird geladen, Bindungen nach Efron', 'Cox regression: R is loaded, ties by Efron'), klein: L('Statable rechnet sie mit R (Paket survival). SPSS rechnet gleiche Zeiten nach Breslow; bei vielen gleichen Zeiten weichen die Zahlen leicht ab. Ob die Hazards über die Zeit proportional sind, prüft Statable mit.', 'Statable calculates it with R (package survival). SPSS handles tied times by Breslow; with many tied times the numbers differ slightly. Statable also checks whether the hazards are proportional over time.') });
        }
        if (aftAn) {   // Später S-F2: AFT-Modell (R, survival::survreg) - die Zeit muss größer als 0 sein
          const zi = s.spalten.findIndex(c => c.name === werte.l1[0]);
          const nullZeit = zi >= 0 ? s.zeilen.filter(z => z[zi] === 0).length : 0;
          if (nullZeit > 0) p.unshift({ art: 'sperre', text: Lp(nullZeit, `Das AFT-Modell braucht Zeiten über 0: ${nullZeit} Zeile hat die Zeit 0`, `Das AFT-Modell braucht Zeiten über 0: ${nullZeit} Zeilen haben die Zeit 0`, `The AFT model needs times above 0: ${nullZeit} row has time 0`, `The AFT model needs times above 0: ${nullZeit} rows have time 0`), klein: L('Es rechnet mit dem Logarithmus der Zeit. Die Cox-Regression kommt mit 0 zurecht; für das AFT-Modell die Zeilen mit Zeit 0 über „Fälle auswählen“ herausnehmen oder die Wahl ausschalten.', 'It works with the logarithm of the time. The Cox regression can handle 0; for the AFT model leave out the rows with time 0 via "Select cases" or switch the choice off.') });
          p.push({ art: 'info', text: L(`AFT-Modell: ${verteilungWort(ueb.aft.dist as AftVerteilung)}, dazu der AIC aller vier Verteilungen`, `AFT model: ${verteilungName(ueb.aft.dist as AftVerteilung)} distribution, plus the AIC of all four distributions`), klein: L('Statable rechnet es mit R (Paket survival). Ein positives b heißt hier eine längere Zeit, bei der Cox-Regression ein höheres Risiko.', 'Statable calculates it with R (package survival). A positive b here means a longer time, in the Cox regression a higher risk.') });
        }
        if (!coxZeitAn && werte.l4.length && ueb.kennung.art !== 'aus') {   // Später S-F2: Cox mit Kennung (cluster oder Frailty)
          if (!ueb.kennung.spalte) p.push({ art: 'hinweis', text: L('Kennung noch nicht gewählt', 'Identifier not chosen yet'), klein: d('Wähle unter „Weitere Wege“ die Spalte, die sagt, welche Zeilen zur selben Person oder Gruppe gehören.', 'Wählen Sie unter „Weitere Wege“ die Spalte, die sagt, welche Zeilen zur selben Person oder Gruppe gehören.', 'Under "More options" choose the column that says which rows belong to the same person or group.') });
          else if ([werte.l1[0], werte.l2[0], ...werte.l4].includes(ueb.kennung.spalte)) p.unshift({ art: 'sperre', text: L('Die Kennung muss eine eigene Spalte sein', 'The identifier must be a column of its own'), klein: L('Zeit, Ereignis, die erklärenden Spalten und die Kennung sind verschiedene Spalten.', 'Time, event, the explanatory columns and the identifier are different columns.') });
          else {
            const ew = ev.einWert ? null : kd.statusWerte[ev.ereignisIndex]?.schluessel ?? null;
            const kg = kennungsGruppen(frailtyDaten(werte.l1[0]!, werte.l2[0]!, ew, ueb.kennung.spalte, werte.l4, s.zeilen, s.spalten));
            if (kg.mitZweiZeilen < 2) p.unshift({ art: 'sperre', text: L('Zu wenige zusammengehörige Zeilen', 'Too few rows that belong together'), klein: L('Es braucht mindestens zwei Gruppen mit je mindestens zwei Zeilen. Gruppen mit nur einer Zeile tragen nichts bei.', 'At least two groups with at least two rows each are needed. Groups with a single row add nothing.') });
            else {
              p.push({ art: kg.gruppen < FRAILTY_GRUPPEN_WENIG ? 'hinweis' : 'ok', text: Lp(kg.gruppen, `${kg.gruppen} Gruppe in der Kennung`, `${kg.gruppen} Gruppen in der Kennung`, `${kg.gruppen} group in the identifier`, `${kg.gruppen} groups in the identifier`), klein: kg.gruppen < FRAILTY_GRUPPEN_WENIG ? L(`Unter ${FRAILTY_GRUPPEN_WENIG} Gruppen sind Standardfehler und Varianz unsicher (Faustregel). Statable rechnet trotzdem.`, `With fewer than ${FRAILTY_GRUPPEN_WENIG} groups, standard errors and variance are uncertain (rule of thumb). Statable calculates anyway.`) : undefined });
            }
          }
        }
        if (kd.ausgelassen > 0) p.push({ art: 'info', text: Lp(kd.ausgelassen, `${kd.ausgelassen} Zeile ohne Zeit, Ereignis oder Gruppe wird ausgelassen`, `${kd.ausgelassen} Zeilen ohne Zeit, Ereignis oder Gruppe werden ausgelassen`, `${kd.ausgelassen} row without time, event or group is left out`, `${kd.ausgelassen} rows without time, event or group are left out`) });
      }
    } else if (verfahren.id === 'mehrebenen') {
      const [y, g] = [werte.l1[0]!, werte.l2[0]!], g2 = werte.l4[0], alleM = [y, g, ...werte.l3, ...(g2 ? [g2] : [])], voll = vollstaendig(alleM), n = voll.length, aus = s.zeilen.length - n;
      const zaehl = new Map<string | number, number>(); for (const z of voll) zaehl.set(z[1]!, (zaehl.get(z[1]!) ?? 0) + 1);
      const ng = zaehl.size, groessen = [...zaehl.values()], gMin = groessen.length ? Math.min(kleinste(groessen)) : 0, gMax = groessen.length ? Math.max(groesste(groessen)) : 0;
      if (new Set(alleM).size < alleM.length) p.unshift({ art: 'sperre', text: L('Eine Spalte steht mehrfach', 'A column is used more than once'), klein: L('Messwert, Gruppe und Erklärungsspalten müssen verschiedene Spalten sein.', 'The measure, the group and the explanatory columns must be different columns.') });
      else if (ng < 2) p.unshift({ art: 'sperre', text: L('Es gibt nur eine Gruppe', 'There is only one group'), klein: d('Ein Mehrebenenmodell braucht mehrere Gruppen. Prüfe die Spalte, die die Gruppen nennt.', 'Ein Mehrebenenmodell braucht mehrere Gruppen. Prüfen Sie die Spalte, die die Gruppen nennt.', 'A multilevel model needs several groups. Check the column that names the groups.') });
      else if (n <= ng) p.unshift({ art: 'sperre', text: L('Jede Gruppe besteht aus einem einzigen Fall', 'Every group consists of a single case'), klein: L('Dann lässt sich die Streuung innerhalb der Gruppen nicht von der zwischen den Gruppen trennen. Gruppen müssen mehrere Fälle enthalten.', 'The variation within groups cannot then be separated from that between groups. Groups must contain several cases.') });
      else {
        if (new Set(voll.map(z => z[0])).size < 2) p.unshift({ art: 'sperre', text: L(`${name(y)}: alle haben denselben Wert`, `${name(y)}: everyone has the same value`), klein: L('Ohne Unterschiede lässt sich nichts berechnen.', 'Without differences nothing can be calculated.') });
        if (g2 && new Set(voll.map(z => z[0])).size === 2) p.unshift({ art: 'sperre', text: L('Mit zwei Gruppierungen nur Messwerte, kein Ja/Nein', 'With two groupings only measured outcomes, not yes/no'), klein: d('Für ein Ja/Nein-Ergebnis rechnet Statable nur mit einer Gruppierung. Nimm die zweite Gruppierung heraus.', 'Für ein Ja/Nein-Ergebnis rechnet Statable nur mit einer Gruppierung. Nehmen Sie die zweite Gruppierung heraus.', 'For a yes/no outcome Statable only uses one grouping. Remove the second grouping.') });
        if (g2) {
          const i2 = 2 + werte.l3.length, z2 = new Set(voll.map(z => z[i2])).size, kreuz = erkenneKreuzung(voll.map(z => String(z[1])), voll.map(z => String(z[i2])));
          if (z2 < MEB_GRUPPEN_WENIG) p.push({ art: 'hinweis', text: L(`Die zweite Gruppierung hat nur ${z2} Stufen`, `The second grouping has only ${z2} levels`), klein: L(`Mit wenigen Stufen ist ihre Varianz sehr unsicher (Faustregel: mindestens ${MEB_GRUPPEN_WENIG}, besser ${MEB_GRUPPEN_GUT}).`, `With few levels its variance is very uncertain (rule of thumb: at least ${MEB_GRUPPEN_WENIG}, preferably ${MEB_GRUPPEN_GUT}).`) });
          p.push(kreuz === 'gekreuzt'
            ? { art: 'ok', text: L(`Zwei Gruppierungen, gekreuzt (${z2} Stufen von „${name(g2)}“)`, `Two groupings, crossed (${z2} levels of "${name(g2)}")`), klein: L('Jede Stufe von „' + name(g2) + '“ kommt bei mehreren Stufen von „' + name(g) + '“ vor. Statable rechnet gekreuzte Zufallseffekte: je Gruppierung ein zufälliger Achsenabschnitt; ohne zufällige Steigung und nur für Messwerte.', 'Each level of "' + name(g2) + '" occurs with several levels of "' + name(g) + '". Statable fits crossed random effects: one random intercept per grouping; no random slope and only for measured outcomes.') + ' ' + L('Achtung: Sind die Kennungen nur innerhalb der ersten Gruppierung eindeutig (zum Beispiel Klasse 1, 2, 3 in jeder Schule), sieht das wie gekreuzt aus, ist aber geschachtelt. Dann zuerst eine eindeutige Kennung bilden (Schule und Klasse zusammen).', 'Caution: if the identifiers are unique only within the first grouping (for example class 1, 2, 3 in every school), this looks crossed but is nested. Then first build a unique identifier (school and class together).') }
            : { art: 'hinweis', text: L('Eine Gruppierung liegt innerhalb der anderen (geschachtelt), nicht gekreuzt', 'One grouping lies within the other (nested), not crossed'), klein: L('Eine Gruppierung liegt innerhalb der anderen (geschachtelt, zum Beispiel Klassen in Schulen), nicht gekreuzt. Statable rechnet es trotzdem richtig, weil die Kennungen eindeutig sind: je Gruppierung ein zufälliger Achsenabschnitt.', 'One grouping lies within the other (nested, for example classes in schools), not crossed. Statable calculates it correctly anyway because the identifiers are unique: one random intercept per grouping.') });
        }
        if (!g2 && new Set(voll.map(z => z[0])).size === 2) p.push({ art: 'info', text: L('Zwei Werte: Statable rechnet ein gemischtes Modell für Ja/Nein', 'Two values: Statable calculates a mixed model for yes/no'), klein: L('Das Ereignis ist der größere der beiden Werte. Statable zeigt Chancenverhältnisse (Odds Ratios) und den Anteil der Streuung zwischen den Gruppen (latenter ICC). Eine zufällige Steigung gibt es hier nicht.', 'The event is the larger of the two values. Statable shows odds ratios and the share of variation between the groups (latent ICC). There is no random slope here.') });
        const wenig = ng < MEB_GRUPPEN_WENIG ? L('Unter 10 Gruppen sind die Varianz zwischen den Gruppen und die Tests sehr unsicher.', 'With fewer than 10 groups the variance between groups and the tests are very uncertain.') : ng < MEB_GRUPPEN_GUT ? L('Faustregel: ab etwa 30 Gruppen ist die Gruppen-Ebene verlässlich.', 'Rule of thumb: the group level is reliable from about 30 groups.') : L('Genug Gruppen für die Gruppen-Ebene (Faustregel: 30).', 'Enough groups for the group level (rule of thumb: 30).');
        p.unshift({ art: ng >= MEB_GRUPPEN_GUT ? 'ok' : 'hinweis', text: L(`${n} Fälle in ${ng} Gruppen`, `${n} cases in ${ng} groups`), klein: `${L(`Fälle je Gruppe: kleinste ${gMin}, größte ${gMax}.`, `Cases per group: smallest ${gMin}, largest ${gMax}.`)} ${wenig}${aus > 0 ? ' ' + Lp(aus, `${aus} Zeile mit einer Lücke wird ausgelassen.`, `${aus} Zeilen mit Lücken werden ausgelassen.`, `${aus} row with a gap is left out.`, `${aus} rows with gaps are left out.`) : ''}` });
        const wachs = erkenneWachstum(s.spalten, s.zeilen, g, werte.l3);
        if (wachs) p.push({ art: 'info', text: L('Das sieht nach Person mal Zeitpunkt aus (Wachstumsmodell)', 'This looks like person by time point (growth model)'), klein: L(`„${name(wachs.zeit)}“ ändert sich innerhalb von „${name(g)}“, im Mittel ${komma(wachs.messungenJeGruppe, 1)} Messungen je Person. Nach dem Rechnen gibt es unter „Für Fachleute“ den Weg „Zeit mit zufälliger Steigung je Person“.`, `"${name(wachs.zeit)}" changes within "${name(g)}", on average ${komma(wachs.messungenJeGruppe, 1)} measurements per person. After calculating, "For specialists" offers the way "time with a random slope per person".`) });
        const einzel = groessen.filter(x => x === 1).length;
        if (einzel > 0 && einzel / ng >= 0.5) p.push({ art: 'hinweis', text: L(`${einzel} von ${ng} Gruppen haben nur einen Fall`, `${einzel} of ${ng} groups have only one case`), klein: L('Solche Gruppen sagen wenig über die Streuung innerhalb der Gruppen. Ist „Gruppe“ eine Nummer, die in jeder Zeile anders ist, passt ein Mehrebenenmodell nicht.', 'Such groups say little about the variation within groups. If "group" is a number that differs in every row, a multilevel model does not fit.') });
      }
      p.push({ art: 'info', text: L('Kann Statable nicht prüfen: Sind die Gruppen voneinander unabhängig (zum Beispiel verschiedene Klassen, nicht dieselben Kinder mehrfach)?', "Statable can't check this: are the groups independent of each other (for example different classes, not the same children several times)?"), klein: L('Innerhalb der Gruppen dürfen die Werte zusammenhängen - das berücksichtigt das Modell. Die Erklärungsspalten sind Merkmale der Fälle; Statable rechnet einen zufälligen Achsenabschnitt je Gruppe.', 'Within groups the values may be related - the model takes that into account. The explanatory columns are characteristics of the cases; Statable fits a random intercept per group.') });
    } else if (verfahren.id === 'faktor') {
      const n = vollstaendig(werte.l1).length;   // wie die Rechnung: nur Personen mit allen Antworten (Nachttest 24.10.: vorher die kleinste Zahl je Spalte, 148 statt 147)
      p.unshift({ art: n >= 5 * werte.l1.length ? 'ok' : 'hinweis', text: Lp(n, `${n} Person für ${werte.l1.length} Fragen`, `${n} Personen für ${werte.l1.length} Fragen`, `${n} person for ${werte.l1.length} questions`, `${n} people for ${werte.l1.length} questions`), klein: L('Faustregel: mindestens 5 Personen je Frage, besser 10.', 'Rule of thumb: at least 5 people per question, ideally 10.') });
    } else {
      if (verfahren.id === 'vorhersage' && ctx.verschieden(werte.l1[0]!) === 2) {
        // Ziel mit zwei Werten: logistische Regression. Gruppengrößen (nur Personen mit allen Angaben) und die Faustregel „10 Fälle je Prädiktor“.
        const ziel = werte.l1[0]!, ix = [ziel, ...werte.l2].map(idx), sps = [ziel, ...werte.l2].map(n => spalteNach(n)!);
        const komplett = s.zeilen.filter(z => ix.every((i, k) => z[i] !== null && z[i] !== undefined && !(typeof z[i] === 'number' && istFehlend(sps[k], z[i] as number))));
        // Mit Häufigkeitsgewicht zählen die Gewichte (Fälle), nicht die Zeilen: sonst nennt die Zeile die falsche Gruppe als kleinere
        const gwH = aktivesGewicht(), gwW = gwH && gwH.art === 'haeufigkeit' ? gewichtsWerte(gwH.spalte) : null;
        const zaehl = new Map<string | number, number>(), kompl = new Set(komplett);
        s.zeilen.forEach((z, r) => { if (!kompl.has(z)) return; const k = z[ix[0]!] as string | number, wz = gwW ? gwW[r] : 1; if (typeof wz === 'number' && wz > 0) zaehl.set(k, (zaehl.get(k) ?? 0) + wz); });
        const sortiert = [...zaehl].sort((a, b) => (typeof a[0] === 'number' && typeof b[0] === 'number' ? a[0] - b[0] : String(a[0]).localeCompare(String(b[0]))));
        const klein = sortiert.length === 2 ? Math.min(sortiert[0]![1], sortiert[1]![1]) : 0;
        const kleinereGruppe = sortiert.length === 2 ? (sortiert[0]![1] <= sortiert[1]![1] ? sortiert[0]![0] : sortiert[1]![0]) : '';
        p.unshift({ art: sortiert.length < 2 || klein < 2 ? 'sperre' : klein < 10 * werte.l2.length ? 'hinweis' : 'ok',
          text: L(`${name(ziel)} hat zwei Werte: ${sortiert.map(([k, n]) => `${gruppenName(ziel, k)} (${n})`).join(` ${L('und', 'and')} `)}`, `${name(ziel)} has two values: ${sortiert.map(([k, n]) => `${gruppenName(ziel, k)} (${n})`).join(` ${L('und', 'and')} `)}`),
          klein: sortiert.length < 2 || klein < 2 ? L('Nach dem Aussortieren von Lücken bleibt ein Wert zu selten - so lässt sich nichts rechnen.', 'After leaving out gaps, one value is too rare - nothing can be calculated.')
            : klein < 10 * werte.l2.length ? Lp(werte.l2.length, `Faustregel: mindestens 10 Fälle je Vorhersage-Spalte in der kleineren Gruppe „${gruppenName(ziel, kleinereGruppe)}“ (hier ${zahlDe(klein)} für ${werte.l2.length} Vorhersage-Spalte). Mit weniger ist das Ergebnis unsicher.`, `Faustregel: mindestens 10 Fälle je Vorhersage-Spalte in der kleineren Gruppe „${gruppenName(ziel, kleinereGruppe)}“ (hier ${zahlDe(klein)} für ${werte.l2.length} Vorhersage-Spalten). Mit weniger ist das Ergebnis unsicher.`, `Rule of thumb: at least 10 cases per predictor in the smaller group "${gruppenName(ziel, kleinereGruppe)}" (here ${zahlDe(klein)} for ${werte.l2.length} predictor). With fewer the result is uncertain.`, `Rule of thumb: at least 10 cases per predictor in the smaller group "${gruppenName(ziel, kleinereGruppe)}" (here ${zahlDe(klein)} for ${werte.l2.length} predictors). With fewer the result is uncertain.`)
            : L(`Statable rechnet die Chance für „${gruppenName(ziel, sortiert[1]![0])}“ gegenüber „${gruppenName(ziel, sortiert[0]![0])}“ (der später sortierte Wert).`, `Statable calculates the odds of "${gruppenName(ziel, sortiert[1]![0])}" versus "${gruppenName(ziel, sortiert[0]![0])}" (the value that sorts later).`) });
      }
      if (verfahren.id === 'vorhersage' && ctx.verschieden(werte.l1[0]!) !== 2) {
        // Welle 3: ordinale, multinomiale und Zähldaten-Regression (Prüfliste aus katpruefung.ts); bei linearer Regression Vorschläge, nie still, mit Knopf
        if (vorhArt) {   // Später S-E: Quantilregression und Strafregression - Sperren und Hinweise aus den Daten (lib/vorhpruefung.ts)
          const fV = vorhFaelle(katDaten('zaehlreg', werte.l1[0]!, werte.l2, s.zeilen, s.spalten)), tg = vorhArt === 'quantil' ? quantilTauGueltig(vorhEff.tau) : { ok: true as const, grund: undefined };
          p.unshift(...(vorhArt === 'quantil' ? quantilBefunde(fV, tg.ok ? vorhEff.tau : [0.5]) : strafBefunde(fV, !vorhEff.standardisieren)).map((b): Punkt => ({ art: b.art, text: b.text })), ...(tg.ok ? [] : [{ art: 'sperre', text: quantilTauGrundText(tg.grund!) } as Punkt]));
        } else if (katArt) p.unshift(...katPruefliste({ art: katArt, ziel: werte.l1[0]!, praed: werte.l2, zeilen: s.zeilen, spalten: s.spalten, modell: modellEffWahl, name }));
        else p.unshift(...katVorschlaege(werte.l1[0]!, werte.l2, s.zeilen, s.spalten, name));
        if ((katArt || vorhArt) && zus.hier.an && hierMoeglich) p.unshift({ art: 'sperre', text: L('Blöcke bilden geht nur mit der linearen Regression', 'Building blocks works only with linear regression'), klein: d('Stelle unter „Modell“ die lineare Regression ein oder nimm den Haken bei „Blöcke bilden“ heraus.', 'Stellen Sie unter „Modell“ die lineare Regression ein oder nehmen Sie den Haken bei „Blöcke bilden“ heraus.', 'Set the model to linear regression or untick "Build blocks".') });
        if (katArt === 'zaehlreg' && modellEffWahl.zeit && [werte.l1[0], ...werte.l2].includes(modellEffWahl.zeit)) p.unshift({ art: 'sperre', text: L('Die Beobachtungszeit muss eine andere Spalte sein', 'The observation time must be a different column'), klein: L('Ziel, Vorhersagespalten und Beobachtungszeit müssen verschiedene Spalten sein.', 'The target, the predictors and the observation time must be different columns.') });
      }
      if (verfahren.id === 'vorhersage' && kursArt && werte.l1[0] && werte.l2.length) {   // Kurs-Paket: Probit und gewichtete Regression
        try {
          if (kursArt === 'probit') p.unshift(...probitPunkte(probitDaten(werte.l1[0], werte.l2, s.zeilen, s.spalten), name));
          else if (kursArt === 'nls') p.unshift(...nlsPunkte(nlsDaten(werte.l1[0], werte.l2, nlsFormel, s.zeilen, s.spalten)));
          else {
            p.unshift(...(zus.modell.zeit ? wlsPunkte(wlsDaten(werte.l1[0], werte.l2, zus.modell.zeit, s.zeilen, s.spalten), name) : [{ art: 'sperre', text: L('Es fehlt die Spalte mit den Präzisionsgewichten.', 'The column with the precision weights is missing.'), klein: d('Wähle sie unter „Weitere Wege“ bei „Modell“.', 'Wählen Sie sie unter „Weitere Wege“ bei „Modell“.', 'Choose it under "More options" at "Model".') } as Punkt]));
            p.push({ art: 'info', text: wlsNichtFallgewicht() });
          }
        } catch { /* eine Spalte fehlt: die übrigen Punkte melden es */ }
      }
      const gwH = aktivesGewicht(), gwHW = gwH && gwH.art === 'haeufigkeit' && verwendetGewicht(verfahren.id, gwH.art) ? gewichtsWerte(gwH.spalte) : null;
      for (const n of alle.filter(x => !istSetName(x))) {
        if (gwHW) {   // Häufigkeitsgewicht: Zeilen und gewichtete Fälle nennen, nicht nur die Zeilen
          const i = idx(n), fe = fehlendMenge(spalteNach(n));
          let zeilen = 0, faelle = 0;
          s.zeilen.forEach((z, r) => { const v = z[i], w = gwHW[r]; if (v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && fe.includes(v)) && typeof w === 'number' && w > 0) { zeilen++; faelle += w; } });
          p.push({ art: 'ok', text: Lp(zeilen, `${name(n)}: ${zeilen} Zeile mit gültigem Wert, gewichtet ${zahlDe(faelle)} Fälle`, `${name(n)}: ${zeilen} Zeilen mit gültigem Wert, gewichtet ${zahlDe(faelle)} Fälle`, `${name(n)}: ${zeilen} row with a valid value, weighted ${zahlDe(faelle)} cases`, `${name(n)}: ${zeilen} rows with a valid value, weighted ${zahlDe(faelle)} cases`) });
          continue;
        }
        p.push({ art: 'ok', text: Lp(ctx.gueltig(n), `${name(n)}: ${ctx.gueltig(n)} gültiger Wert`, `${name(n)}: ${ctx.gueltig(n)} gültige Werte`, `${name(n)}: ${ctx.gueltig(n)} valid value`, `${name(n)}: ${ctx.gueltig(n)} valid values`) });
      }
      if (verfahren.id === 'vorhersage') p.push(...gruppenPruefliste(werte.l2));
    }
    // Zu wenige Werte: PSPP rechnet trotzdem und liefert NaN (Test 07.10.: Korrelation mit 1 Person).
    if (verfahren.id === 'korrmatrix') {
      const ohne = werte.l1.filter(n => ctx.verschieden(n) < 2);
      if (werte.l1.length > MATRIX_GRENZE) p.unshift({ art: 'sperre', text: L(`Zu viele Spalten: ${werte.l1.length}, höchstens ${MATRIX_GRENZE}`, `Too many columns: ${werte.l1.length}, at most ${MATRIX_GRENZE}`), klein: d('Eine so große Matrix lässt sich nicht mehr lesen. Wähle die Spalten, um die es in der Frage geht.', 'Eine so große Matrix lässt sich nicht mehr lesen. Wählen Sie die Spalten, um die es in der Frage geht.', 'A matrix this large can no longer be read. Choose the columns your question is about.') });
      if (ohne.length) p.unshift({ art: 'sperre', text: L(`Ohne Streuung: ${ohne.map(name).join(', ')}`, `No spread: ${ohne.map(name).join(', ')}`), klein: d('Eine Spalte, in der alle denselben Wert haben, kann mit nichts zusammenhängen. Nimm sie aus der Auswahl.', 'Eine Spalte, in der alle denselben Wert haben, kann mit nichts zusammenhängen. Nehmen Sie sie aus der Auswahl.', 'A column in which everyone has the same value cannot be related to anything. Remove it from the selection.') });
      const emp = empfohleneKorrelationListe(werte.l1, ctx), k = werte.l1.length;
      p.push({ art: 'info', text: emp.methode === 'spearman' ? L(`Rangkorrelation nach Spearman für alle ${k * (k - 1) / 2} Paare`, `Spearman's rank correlation for all ${k * (k - 1) / 2} pairs`) : L(`Korrelation nach Pearson für alle ${k * (k - 1) / 2} Paare`, `Pearson correlation for all ${k * (k - 1) / 2} pairs`), klein: `${matrixGrundText(emp.grund, emp.methode)} ${L('Im Ergebnis lässt sich die Art umschalten und die Holm-Korrektur zuschalten.', 'In the result you can switch the type and turn on the Holm correction.')}`, erklaer: 'korrelationsmatrix' });
      if (k > 10) p.push({ art: 'hinweis', text: L(`Viele Paare: ${k * (k - 1) / 2}`, `Many pairs: ${k * (k - 1) / 2}`), klein: L('Bei so vielen Paaren fallen leicht einige zufällig unter ,05. Die Holm-Korrektur im Ergebnis gleicht das aus.', 'With this many pairs some easily fall below .05 by chance. The Holm correction in the result compensates for this.') });
      p.push({ art: 'info', text: L('Lücken zählen paarweise', 'Gaps are handled pairwise'), klein: L('Je Paar gehen alle Personen ein, die bei beiden Spalten eine Angabe haben (wie in SPSS). Darum kann n je Paar verschieden sein.', 'Each pair uses everyone with answers in both columns (as in SPSS). So n can differ from pair to pair.') });
    }
    p.push(...zusatzPunkte());
    const mind = verfahren.id === 'korrmatrix' || verfahren.id === 'zusammenhang' || verfahren.id === 'skala' || verfahren.id === 'praepost' ? 3 : verfahren.id === 'vorhersage' ? regVariablen(regTerme(werte.l2, ctx.faktor)).length + 2 : verfahren.id === 'faktor' ? werte.l1.length + 1 : verfahren.id === 'gruppen' || verfahren.id === 'messwiederholung' || verfahren.id === 'einzelfall' || verfahren.id === 'kaplanmeier' || verfahren.id === 'mehrebenen' ? 0 : 1;
    if (verfahren.id === 'verteilung' || verfahren.id === 'kreuz') {
      for (const n of alle.filter(istSetName)) {
        const m = mehrfachFuer(n, verfahren.id === 'kreuz' ? werte.l2[0] : undefined);
        if (!m) { p.unshift({ art: 'sperre', text: L(`Das Set ${name(n)} passt nicht mehr zu den Daten`, `The set ${name(n)} no longer fits the data`), klein: d('Eine seiner Spalten gibt es nicht mehr. Korrigiere das Set bei „Spalten beschreiben“.', 'Eine seiner Spalten gibt es nicht mehr. Korrigieren Sie das Set bei „Spalten beschreiben“.', 'One of its columns no longer exists. Correct the set under "Describe columns".') }); continue; }
        p.unshift({ art: 'info', text: L(`${name(n)}: Mehrfachantworten-Set aus ${m.optionen.length} Spalten`, `${name(n)}: multiple response set from ${m.optionen.length} columns`), klein: L(`Ankreuzen heißt: Wert ${m.zaehlText}. Statable rechnet selbst, nicht PSPP.`, `Checked means: value ${m.zaehlText}. Statable calculates it itself, not PSPP.`) });
        for (const h of mehrfachHinweise(m).reverse()) p.unshift({ art: m.faelle === 0 && h.art !== 'info' ? 'sperre' : h.art, text: h.text, klein: h.klein, erklaer: h.art === 'info' ? 'prozent-der-faelle' : 'stichprobe' });
      }
    }
    const nMin = alle.filter(x => !istSetName(x)).length ? Math.min(kleinste(alle.filter(x => !istSetName(x)).map(ctx.gueltig))) : alle.length ? 1 : 0;
    if (nMin < mind) p.unshift({ art: 'sperre', text: Lp(nMin, `Zu wenige Daten: ${nMin} Person mit Angaben, nötig sind mindestens ${mind}`, `Zu wenige Daten: ${nMin} Personen mit Angaben, nötig sind mindestens ${mind}`, `Not enough data: ${nMin} person with answers, at least ${mind} needed`, `Not enough data: ${nMin} people with answers, at least ${mind} needed`), klein: L('Mit so wenigen Werten lässt sich das nicht sinnvoll rechnen.', 'With so few values this cannot be calculated meaningfully.') });
    // Paket 1E: rechnet die Auswertung mit einer Spalte aus dem Codierungen-Import, steht einmal der Hinweis zu 0 = „nicht erwähnt“ (und bei n < 30 zur gezielten Auswahl); keine Sperre
    if (!['verteilung', 'kategorien', 'faelle'].includes(verfahren.id)) { const ch = codeSpaltenHinweis(s.spalten, alle.filter(x => !istSetName(x)), nMin); if (ch) p.push({ art: 'hinweis', text: ch.text, ...(ch.klein ? { klein: ch.klein } : {}) }); }
    if (!['uebereinstimmung', 'messwiederholung', 'mediation', 'moderation', 'einzelfall', 'mehrebenen', 'faelle', 'zeitreihen', 'cluster'].includes(verfahren.id)) p.push({ art: 'info', text: L('Kann Statable nicht prüfen: Haben alle unabhängig voneinander geantwortet?', "Statable can't check this: did everyone answer independently?"), klein: L('Das ergibt sich aus der Befragung.', 'That follows from how the survey was done.'), erklaer: 'voraussetzung' });
    // Hinweis auf eine mögliche Gruppierung (Klasse, Seminar …): Dann sind die Werte nicht unabhängig - ein Mehrebenenmodell berücksichtigt das.
    if (ebenenPruefliste) { const h = ebenenHinweisText(ebenenPruefliste.v, name); p.push({ art: 'info', text: h.kurz, klein: h.klein, knopf: h.knopf, ebenen: ebenenPruefliste.vorschlag }); }
    return p;
  });
  const gesperrt = $derived(pruefliste.some(p => p.art === 'sperre'));

  async function klaere(key: string) {
    const f = s.funde.find(x => fundSchluessel(x) === key); if (!f) return;
    if (f.art === 'schreibweise') {
      const paare = Object.entries(f.zuordnung).map(([a, b]) => `(${zitWert(a)}=${zitWert(b)})`).join(' ');
      await aendere(L(`Schreibweisen bei ${f.spalte} zusammengefasst`, `Spellings in ${f.spalte} merged`), `RECODE ${f.spalte} ${paare}.\nEXECUTE.`, undefined, { art: 'datencheck', ausDaten: true });
      s.entscheid[key] = 'erledigt'; sichern(); melde(L('Zusammengefasst.', 'Merged.'), true); return;
    }
    if (f.art !== 'platzhalter') return;
    const sp = spalteNach(f.spalte)!;
    const codes = fehlendMitWert(sp, Number(f.wert));
    if (!codes) { melde(L('Alle Plätze für „keine Angabe“ sind schon belegt (drei Einzelwerte, oder ein Bereich und ein Einzelwert).', 'All slots for "no answer" are taken (three single values, or one range and one single value).')); return; }
    await aendere(L(`${f.wert} bei ${f.spalte} als „keine Angabe“`, `${f.wert} in ${f.spalte} set as "no answer"`), `MISSING VALUES ${f.spalte} (${fehlendSyntax(codes)}).`, undefined, { art: 'datencheck' });
    s.entscheid[key] = 'erledigt'; melde(L(`${f.wert} gilt jetzt als „keine Angabe“.`, `${f.wert} now counts as "no answer".`), true);
  }

  /* ---------- Rechnen ---------- */
  const gruppenFolge = $derived.by(() => {
    if (verfahren?.id !== 'gruppen' || !werte.l2[0] || !werte.l1[0]) return [];
    const ig = idx(werte.l2[0]), iv = idx(werte.l1[0]), sp = spalteNach(werte.l1[0]);
    const m = new Map<string | number, number[]>();
    for (const z of s.zeilen) { const g = z[ig], v = z[iv]; if (g === null || g === undefined || typeof v !== 'number' || istFehlend(sp, v)) continue; (m.get(g) ?? m.set(g, []).get(g)!).push(v); }
    return [...m].filter(([, a]) => a.length >= 2).sort((a, b) => b[1].reduce((x, y) => x + y, 0) / b[1].length - a[1].reduce((x, y) => x + y, 0) / a[1].length);
  });
  const syntax = $derived.by(() => {
    if (!verfahren || !fertigGewaehlt) return '';
    if (verfahren.id === 'kaplanmeier' && kmVorschau && (sterbeAn || coxZeitAn)) {   // Später S-F (A): Sterbetafel (JavaScript) und Cox mit zeitabhängiger Größe (R); „Befehl“ zeigt, was gerechnet wird
      const teile = [verfahren.syntax(werte, ctx)];
      if (sterbeAn) teile.push(L('# Sterbetafel: Statable rechnet sie selbst (JavaScript) nach dem Algorithmus von IBM SPSS Statistics (SURVIVAL); in R gibt es sie als KMsurv::lifetab. Gehan (Wilcoxon) näherungsweise: die Zeit jedes Falls wird durch den Anfang seines Intervalls ersetzt.', '# Life table: Statable calculates it itself (JavaScript) after the algorithm of IBM SPSS Statistics (SURVIVAL); in R it is KMsurv::lifetab. Gehan (Wilcoxon) approximate: the time of each case is replaced by the start of its interval.'));
      if (coxZeitAn) teile.push(coxZpRCode({ start: kzSpalten.start, stopp: kzSpalten.stopp, ereignis: kzSpalten.ereignis, praed: [kzSpalten.wert, ...kzSpalten.fest], faktoren: coxZeitVorbereiten(s.zeilen, s.spalten, kzSpalten, kmVorschau.einWert ? null : kaplanDaten(werte).statusWerte[kmVorschau.ereignisIndex]?.schluessel ?? null).faktoren }, L));
      else if (werte.l4.length) teile.push(coxRCode({ zeit: werte.l1[0]!, ereignis: werte.l2[0]!, ereignisWert: kmVorschau.einWert ? null : String(kaplanDaten(werte).statusWerte[kmVorschau.ereignisIndex]?.schluessel ?? ''), praed: coxDaten(werte.l1[0]!, werte.l2[0]!, null, werte.l4, s.zeilen, s.spalten).praed }, L));
      return teile.join('\n\n');
    }
    if (verfahren.id === 'kaplanmeier' && werte.l4.length && kmVorschau) {   // Welle 7, M1: Cox-Regression mit R; „Befehl“ zeigt zusätzlich den R-Aufruf
      const ew = kmVorschau.einWert ? null : String(kaplanDaten(werte).statusWerte[kmVorschau.ereignisIndex]?.schluessel ?? '');
      const pd = coxDaten(werte.l1[0]!, werte.l2[0]!, null, werte.l4, s.zeilen, s.spalten).praed, fk = Object.fromEntries(pd.filter(x => x.art === 'faktor').map(x => [x.name, x.stufen]));
      const mehr = [
        ...(aftAn ? [aftRCode({ zeit: werte.l1[0]!, ereignis: werte.l2[0]!, ereignisWert: ew, praed: pd.map(x => x.name), dist: ueb.aft.dist as AftVerteilung, faktoren: fk }, L)] : []),
        ...(frailtyAn ? [frailtyRCode({ zeit: werte.l1[0]!, ereignis: werte.l2[0]!, ereignisWert: ew, kennung: ueb.kennung.spalte, praed: pd.map(x => x.name), art: ueb.kennung.art as FrailtyArt, ties: ueb.kennung.ties as FrailtyBindung, faktoren: fk }, L)] : [])];
      return [`${verfahren.syntax(werte, ctx)}\n\n${coxRCode({ zeit: werte.l1[0]!, ereignis: werte.l2[0]!, ereignisWert: ew, praed: pd }, L)}`, ...mehr].join('\n\n');
    }
    if (verfahren.id === 'vorhersage' && kursArt && werte.l1[0] && werte.l2.length) {   // Kurs-Paket: R rechnet (nur stats); „Befehl“ zeigt den R-Aufruf
      return kursArt === 'probit' ? probitRCode(werte.l1[0], werte.l2) : kursArt === 'nls' ? (nlsFormel && werte.l2.length === 1 ? nlsRCode(werte.l1[0], werte.l2[0]!, nlsFormel) : '') : zus.modell.zeit ? wlsRCode(werte.l1[0], werte.l2, zus.modell.zeit) : '';
    }
    if (verfahren.id === 'vorhersage' && vorhArt) {   // Später S-E: R rechnet (quantreg bzw. glmnet); „Befehl“ zeigt den R-Aufruf
      const dt = katDaten('zaehlreg', werte.l1[0]!, werte.l2, s.zeilen, s.spalten), nV = strafVollstaendig(dt);
      return vorhArt === 'quantil' ? quantilRCode({ ziel: werte.l1[0]!, praed: dt.praed, taus: vorhEff.tau, ki: quantilKiWahl(nV, vorhEff.ki).ki, B: QR_B, startwert: QR_STARTWERT })
        : strafRCode({ ziel: werte.l1[0]!, praed: dt.praed, alpha: vorhEff.alpha, regel: vorhEff.regel, standardisieren: vorhEff.standardisieren, K: strafK(nV) ?? 10, R: STRAF_WDH, startwert: STRAF_STARTWERT });
    }
    if (verfahren.id === 'vorhersage' && katArt) {   // Welle 3: R rechnet; „Befehl“ zeigt den R-Aufruf (wie beim Mehrebenenmodell)
      const dt = katDaten(katArt, werte.l1[0]!, werte.l2, s.zeilen, s.spalten);
      return katRCode({ art: katArt, ziel: werte.l1[0]!, praed: dt.praed, stufen: katArt === 'zaehlreg' ? [] : stufenMitFaellen(katStufen), referenz: modellEffWahl.referenz, modell: modellEffWahl.zaehl, zeit: modellEffWahl.zeit || undefined }, L);
    }
    if (verfahren.id === 'mediation' && prozessModell !== 4 && werte.l4[0]) {   // Später S-D, G14: je Gleichung ein Lauf; Statable rechnet Effekte und Bootstrap selbst
      const modell = prozessModell as ProzessModellNr, [x, y, m, v] = [werte.l1[0]!, werte.l2[0]!, werte.l3[0]!, werte.l4[0]];
      if (new Set([x, y, m, v]).size < 4) return '';
      const dt = prozessDatenAus(modell, werte);
      if (dt.n < 10) return '';
      return `${L('* PSPP rechnet die Gleichungen (je eine Regression mit denselben Fällen); die Effekte mit gemeinsamem Bootstrap-Intervall rechnet Statable selbst.', '* PSPP calculates the equations (one regression each, with the same cases); Statable calculates the effects with their common bootstrap interval itself.')}\n${prozessBefehl(modell, modell === 6 ? { x, m, y, m2: v } : { x, m, y, w: v }, dt.daten, s.spalten.map(sp => sp.name))}`;
    }
    if (verfahren.id === 'moderation') {
      const [x, y, w] = [werte.l1[0]!, werte.l2[0]!, werte.l3[0]!], voll = vollstaendig([x, y, w]);
      if (new Set([x, y, w]).size < 3 || voll.length < 2) return '';
      return moderationBefehl(x, w, y, mittelwert(voll.map(z => z[0] as number)), mittelwert(voll.map(z => z[2] as number)), hilfsNamen(s.spalten.map(sp => sp.name)));
    }
    // G3: GLM mit Zahlen als Faktoren (Text-Gruppen werden für die Rechnung kodiert). G6: vier Regressionen mit den 0/1-Hilfsspalten der Gruppe.
    if (verfahren.id === 'gruppen' && werte.l3.length && werte.l4.length) return '';
    if (verfahren.id === 'gruppen' && werte.l3.length) {
      const [y, a, b] = [werte.l1[0]!, werte.l2[0]!, werte.l3[0]!];
      if (new Set([y, a, b]).size < 3 || vollstaendig([y, a, b]).length < 4) return '';
      const ein = anova2Eingabe(y, a, b);
      return anova2Lauf(y, ein.ka, ein.kb, s.spalten.map(sp => sp.name));
    }
    if (verfahren.id === 'gruppen' && werte.l4.length) {
      const [y, g, x] = [werte.l1[0]!, werte.l2[0]!, werte.l4[0]!];
      if (werte.l4.length > 1) return new Set([y, g, ...werte.l4]).size < 2 + werte.l4.length ? '' : verfahren.syntax(werte, ctx);   // mehrere Kontrollvariablen: Statable rechnet selbst, im Befehl steht nur der Kommentar
      const faktor = new Set([y, g, x]).size < 3 ? null : ancovaFaktor(g);
      return faktor ? kovarianzBefehl(y, faktor, x) : '';
    }
    if (verfahren.id === 'vorhersage' && zusEff.hier.an) { const bt = hierTerme(werte.l2, zusEff); if (bt) return hierregBefehl(werte.l1[0]!, bt); }
    let t = verfahren.syntax(verfahren.id === 'uebereinstimmung' ? { ...werte, l3: uebWunsch ? [uebWunsch] : [] } : werte, ctx);
    if (verfahren.id === 'gruppen' && gruppenFolge.length >= 2) {
      const q = (v: string | number) => (typeof v === 'number' ? String(v) : zitWert(v));
      if (gruppenFolge.length === 2 || ctx.verschieden(werte.l2[0]!) === 2) t = `T-TEST GROUPS=${werte.l2[0]}(${q(gruppenFolge[0]![0])} ${q(gruppenFolge[1]![0])})\n  /VARIABLES=${werte.l1[0]}.`;
    }
    if (verfahren.id === 'kreuz' && prozentAn(zusEff)) t = t.replace('/CELLS=COUNT ROW EXPECTED.', kreuzZellenSyntax(prozentBasen(zusEff)));   // Später S-C: Spalten- und Gesamtprozent wählbar (Voreinstellung bleibt Zeile)
    return t;
  });

  async function rechnen() {
    if (!verfahren || rechnet) return;
    if (pruefliste.some(p => p.art === 'sperre')) { if (verfahren.id === 'meta') { melde(L('Erst die Tabelle der Studien vervollständigen.', 'Complete the table of studies first.')); } const ziel = document.querySelector<HTMLElement>('[data-klaeren]') ?? document.getElementById('pruef-sperre'); if (ziel) { ziel.tabIndex = -1; ziel.focus(); } return; }
    await blattRechnen(verfahren, werte, syntax);
  }
  /** Rechnet ein Blatt fertig durch, ohne es abzulegen. Gibt null zurück, wenn die Rechnung überholt (`gilt()` false), gescheitert oder unvollständig ist -
   *  so entstehen nie halbe Blätter. */
  /** Später S-B (M3): die Gewichte je Zeile (Häufigkeitsgewicht), wenn das Fallgewicht gilt; sonst `null`. */
  const gewichtLageW = (): number[] | null => { const l = gewichtLage(); return l.art === 'gilt' ? l.pruefung.w : null; };
  /** Später S-B (M3): Zählungen je Schicht (Zeilen und Spalten in der Reihenfolge der PSPP-Tabelle: nach Wert sortiert) aus den Daten; `null`, wenn die Reihenfolge nicht zur Tabelle passt. */
  function schichtFuer(k: Kreuz, zeileV: string, spalteV: string, schichtV: string, w: number[] | null): SchichtDaten | null {
    const z = k.zaehlung; if (!z) return null;
    const iz = idx(zeileV), is = idx(spalteV), ik = idx(schichtV), fz = fehlendMenge(spalteNach(zeileV)), fs = fehlendMenge(spalteNach(spalteV)), fk = fehlendMenge(spalteNach(schichtV));
    const ok = (v: unknown, fe: Fehlmenge): v is string | number => v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && fe.includes(v));
    const zeilen: { z: string | number; s: string | number; k: string | number; w: number }[] = [];
    s.zeilen.forEach((r, i) => { const a = r[iz], b = r[is], c = r[ik], g = w ? w[i] ?? 0 : 1; if (ok(a, fz) && ok(b, fs) && ok(c, fk) && g > 0) zeilen.push({ z: a, s: b, k: c, w: g }); });
    const ordnen = (v: (string | number)[]) => [...new Set(v)].sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0));
    const zv = ordnen(zeilen.map(r => r.z)), sv = ordnen(zeilen.map(r => r.s)), kv = ordnen(zeilen.map(r => r.k));
    if (zv.length !== z.zeilen.length || sv.length !== z.spalten.length || !kv.length) return null;
    const stufen = zaehleSchichten(zeilen.map(r => ({ z: String(r.z), s: String(r.s), k: String(r.k), w: r.w })), zv.map(String), sv.map(String), kv.map(String));
    return { spalte: name(schichtV), stufen: stufen.map((st, i) => ({ ...st, name: gruppenName(schichtV, kv[i]!) })), korrektur: true };
  }
  async function berechneBlatt(verfahren: Verfahren, werte: Werte, syntax: string, gilt: () => boolean = () => true, z: ZusatzWahl = $state.snapshot(zusEff) as ZusatzWahl): Promise<Blatt | null> {
    {
      if (verfahren.id === 'kategorien') return gilt() ? neuesKatBlatt(werte.l1[0]!, verfahren.titelBlatt(werte, spalteNach, ctx)) : null;   // keine Rechnung: das Blatt ist der Editor (bausteine/KategorienBlatt.svelte)
      // Mit welchem Fallgewicht gerechnet wird (Abdruck am Blatt). Karten, die das Gewicht nicht verwenden (Einzelfall, Fälle, Meta-Analyse, Daten-Check), tragen keinen Abdruck:
      // dort steht nur der Hinweis „Das Fallgewicht wird hier nicht verwendet.“, nie „gewichtet mit …“.
      const gw0 = aktivesGewicht(), gw = gw0 && verwendetGewicht(verfahren.id, gw0.art) ? gw0 : undefined;
      // Später S-D2 (Bauer B): Umfragegewicht mit „Personen einzeln gezogen: Ja“ - Gruppenvergleich und einfache Regression rechnet R (survey) mit designbasierten Standardfehlern; PSPP rechnet hier nicht
      if (gw && nutztDesign(gw) && DESIGN_ANGEBUNDEN[verfahren.id] && (verfahren.id === 'gruppen' ? !werte.l3.length && !werte.l4.length : verfahren.id === 'vorhersage' && z.modell.art === 'linear' && !z.hier.an)) {
        const pr = gewichtLage(); if (pr.art !== 'gilt') return null;
        mebFehler = '';
        try {
          const sp = $state.snapshot(s.spalten) as Spalte[], zielV = werte.l1[0]!;
          const db = verfahren.id === 'gruppen'
            ? await gruppenRechnen(umfrageRechnen, zielV, werte.l2[0]!, pr.pruefung.w, s.zeilen, sp, gw.entwurf)
            : await regressionRechnen(umfrageRechnen, zielV, werte.l2, ctx.verschieden(zielV) === 2 ? ctx.logistik(zielV) : null, ctx.faktor, pr.pruefung.w, s.zeilen, sp, gw.entwurf);
          if (!gilt()) return null;
          const abdruck = abdruckMitRechenweg(gw, 'design'), e = gewichtetLeer(verfahren.id as GewichteteKarte, abdruck, pr.pruefung.w);
          e.designB = db;
          return { id: Math.random().toString(36).slice(2, 8), titel: verfahren.titelBlatt(werte, spalteNach, ctx), art: verfahren.id, l1: werte.l1[0] ?? null, l2: werte.l2[0] ?? null, l3: verfahren.id === 'zeitreihen' ? zeitreiheSpalten(werte) : [...werte.l1, ...werte.l2, ...werte.l3, ...werte.l4],
            syntax: gw.entwurf ? L(`* Umfragegewicht ${pk(gw.spalte)}, Stichprobenplan ${pk(entwurfWorte(gw.entwurf))}: Standardfehler, Intervalle und Tests designbasiert mit dem R-Paket survey (svydesign mit Schichten, Klumpen und Grundgesamtheit nach dem Plan; ${pk(verfahren.id === 'gruppen' ? 'svyglm, regTermTest' : 'svyglm')}).`,
              `* Survey weight ${pk(gw.spalte)}, sampling design ${pk(entwurfWorte(gw.entwurf))}: standard errors, intervals and tests design-based with the R package survey (svydesign with strata, clusters and population size as stated; ${pk(verfahren.id === 'gruppen' ? 'svyglm, regTermTest' : 'svyglm')}).`)
            : L(`* Umfragegewicht ${pk(gw.spalte)}, Personen einzeln gezogen: Standardfehler, Intervalle und Tests designbasiert mit dem R-Paket survey (svydesign(ids = ~1, weights = ~${pk(gw.spalte)}); ${pk(verfahren.id === 'gruppen' ? 'svyglm, regTermTest' : 'svyglm')}).`,
              `* Survey weight ${pk(gw.spalte)}, people drawn individually: standard errors, intervals and tests design-based with the R package survey (svydesign(ids = ~1, weights = ~${pk(gw.spalte)}); ${pk(verfahren.id === 'gruppen' ? 'svyglm, regTermTest' : 'svyglm')}).`),
            items: [], ergebnis: { typ: 'gewichtet', e }, imBericht: true, notiz: '', zeit: Date.now(), stand: standFuer(werte), gewicht: abdruck };
        } catch (x) { if (!gilt()) return null; mebFehler = (x as Error).message; await tick(); document.getElementById('meb-fehler')?.focus(); return null; }
      }
      if (gw && gw.art === 'umfrage' && (BESCHREIBEND as readonly string[]).includes(verfahren.id)) {
        // Umfragegewicht: nur beschreibend gewichtet, in JavaScript - PSPP würde die Gewichte wie Häufigkeiten behandeln (Fachblatt S-A, 1.2)
        const pr = gewichtLage(); if (pr.art !== 'gilt') return null;
        // Später S-D2 (Bauer A2): Umfragegewicht mit „Personen einzeln gezogen: Ja“ - Verteilung und Kreuztabelle bekommen Standardfehler, Intervalle und Test von R (survey)
        const mitSurvey = klumpenfreiFuer(verfahren.id, gw) === true && (verfahren.id === 'verteilung' || verfahren.id === 'kreuz');
        const gwA = mitSurvey ? abdruckMitRechenweg(gw, 'design') : gw;
        const quelle = { spalten: $state.snapshot(s.spalten) as Spalte[], zeilen: s.zeilen, w: pr.pruefung.w };
        const e = gewichtetBeschreiben(verfahren.id as GewichteteKarte, werte, quelle, gwA);
        if (mitSurvey) {
          mebFehler = ''; katFehler = '';
          try { e.design = verfahren.id === 'verteilung' ? await umfrageVerteilungRechnen(e, quelle, umfrageTestWert(z.umfrage), z.umfrage?.anteil === 'beta' ? 'beta' : 'logit') : await umfrageKreuzRechnen(e, quelle); }
          catch (x) { if (!gilt()) return null; mebFehler = (x as Error).message; katFehler = mebFehler; await tick(); document.getElementById('meb-fehler')?.focus(); return null; }
        }
        if (!gilt()) return null;
        return { id: Math.random().toString(36).slice(2, 8), titel: verfahren.titelBlatt(werte, spalteNach, ctx), art: verfahren.id, l1: werte.l1[0] ?? null, l2: werte.l2[0] ?? null, l3: verfahren.id === 'zeitreihen' ? zeitreiheSpalten(werte) : [...werte.l1, ...werte.l2, ...werte.l3, ...werte.l4],
          syntax: mitSurvey && gw.entwurf ? L(`* Umfragegewicht ${pk(gw.spalte)}, Stichprobenplan ${pk(entwurfWorte(gw.entwurf))}: Statable rechnet gewichtete Mittelwerte, Anteile und Prozente selbst; Standardfehler, Intervalle und Tests rechnet das R-Paket survey (Version 4.5, Taylor-Linearisierung, svydesign mit Schichten, Klumpen und Grundgesamtheit nach dem Plan).`, `* Survey weight ${pk(gw.spalte)}, sampling design ${pk(entwurfWorte(gw.entwurf))}: Statable calculates weighted means, proportions and percentages itself; standard errors, intervals and tests are calculated by the R package survey (version 4.5, Taylor linearization, svydesign with strata, clusters and population size as stated).`)
            : mitSurvey ? L(`* Umfragegewicht ${pk(gw.spalte)}: Statable rechnet gewichtete Mittelwerte, Anteile und Prozente selbst; Standardfehler, Intervalle und Tests rechnet das R-Paket survey (Version 4.5, Taylor-Linearisierung, svydesign(ids = ~1, weights = ~${pk(gw.spalte)})).`, `* Survey weight ${pk(gw.spalte)}: Statable calculates weighted means, proportions and percentages itself; standard errors, intervals and tests are calculated by the R package survey (version 4.5, Taylor linearization, svydesign(ids = ~1, weights = ~${pk(gw.spalte)})).`)
            : L(`* Umfragegewicht ${pk(gw.spalte)}: Statable rechnet gewichtete Mittelwerte, Anteile und Prozente selbst (kein PSPP-Befehl, keine Tests).`, `* Survey weight ${pk(gw.spalte)}: Statable calculates weighted means, proportions and percentages itself (no PSPP command, no tests).`),
          items: [], ergebnis: { typ: 'gewichtet', e }, imBericht: true, notiz: '', zeit: Date.now(), stand: standFuer(werte), gewicht: gwA, ...(zusatzAn(z) ? { zus: kopiereZusatz(z) } : {}) };
      }
      const nurSets = (verfahren.id === 'verteilung' && werte.l1.every(istSetName)) || (verfahren.id === 'kreuz' && istSetName(werte.l1[0] ?? ''));   // Mehrfachantworten rechnet Statable selbst
      const jn = jaNeinFall(verfahren, werte);   // G5: McNemar und Cochran-Q rechnet Statable selbst, PSPP läuft nicht
      const katA: KatArt | null = verfahren.id === 'vorhersage' ? (z.modell.art === 'ordinal' ? 'ordreg' : z.modell.art === 'multi' ? 'multreg' : z.modell.art === 'zaehl' ? 'zaehlreg' : null) : null;   // Welle 3: R rechnet
      const vorhA: 'quantil' | 'penal' | null = verfahren.id === 'vorhersage' ? (z.modell.art === 'quantil' ? 'quantil' : z.modell.art === 'penal' ? 'penal' : null) : null;   // Später S-E: R rechnet (quantreg, glmnet)
      const kursA: 'probit' | 'wls' | 'nls' | null = verfahren.id === 'vorhersage' ? (z.modell.art === 'probit' ? 'probit' : z.modell.art === 'wls' ? 'wls' : z.modell.art === 'nls' ? 'nls' : null) : null;   // Kurs-Paket: R rechnet (glm bzw. lm, nur stats)
      const items = nurSets || jn || katA || vorhA || kursA || verfahren.id === 'diskriminanz' || verfahren.id === 'loglinear' || verfahren.id === 'manova' || verfahren.id === 'armut' || verfahren.id === 'messwiederholung' || verfahren.id === 'einzelfall' || verfahren.id === 'kaplanmeier' || verfahren.id === 'faelle' || verfahren.id === 'mehrebenen' || verfahren.id === 'meta' || verfahren.id === 'zeitreihen' || verfahren.id === 'cluster' ? [] : await rechne((gw ? gewichtBefehl(gw) + '\n' : '') + syntax).catch(x => { if (x instanceof EngineAbgebrochen) return null; throw x; });   // mit Fallgewicht steht `WEIGHT BY` vor dem Befehl: das Blatt rechnet auch aus der Befehlsliste gewichtet
      if (!items) return null;   // PSPP kann keine Messwiederholung: Statable rechnet selbst
      if (gw) for (const it of items) if (it.type === 'table') it.gewicht = { ...gw };   // jede Tabelle trägt das Fallgewicht (Fußzeile)
      if (!gilt()) return null;
      let ergebnis: Blatt['ergebnis'] = null;
      if (verfahren.id === 'meta') {
        mebFehler = '';
        const ein = metaPrueflisteWert.eingabe;
        if (!ein) return null;
        try { const e = await metaRechnen(ein); if (!gilt()) return null; ergebnis = { typ: 'meta', e }; syntax = metaRCode(ein, L); }
        catch (x) { if (!gilt()) return null; mebFehler = (x as Error).message; await tick(); document.getElementById('meb-fehler')?.focus(); return null; }
      }
      if (verfahren.id === 'mehrebenen') {
        mebFehler = '';
        try { const e = await mehrebenenRechnen(werte.l1[0]!, werte.l2[0]!, werte.l3, werte.l4[0] ? { gruppe2: werte.l4[0] } : {}); if (!gilt()) return null; ergebnis = { typ: 'mehrebenen', e }; }
        catch (x) { if (!gilt()) return null; mebFehler = (x as Error).message; await tick(); document.getElementById('meb-fehler')?.focus(); return null; }
      }
      if (katA) {
        mebFehler = ''; katFehler = '';
        try {
          const ziel = werte.l1[0]!, praed = werte.l2;
          const e = katA === 'ordreg' ? await ordregRechnen(ziel, praed) : katA === 'multreg' ? await multregRechnen(ziel, praed, z.modell.referenz) : await zaehlregRechnen(ziel, praed, { modell: z.modell.zaehl, zeit: z.modell.zeit || undefined });
          if (!gilt()) return null;
          ergebnis = (katA === 'ordreg' ? { typ: 'ordreg', e } : katA === 'multreg' ? { typ: 'multreg', e } : { typ: 'zaehlreg', e }) as Blatt['ergebnis'];
        } catch (x) { if (!gilt()) return null; mebFehler = (x as Error).message; katFehler = mebFehler; await tick(); document.getElementById('meb-fehler')?.focus(); return null; }
      }
      if (vorhA) {
        mebFehler = ''; katFehler = '';
        try {
          const v = kopiereVorh(z.vorh);
          const e = vorhA === 'quantil' ? await quantilRechnen(werte.l1[0]!, werte.l2, { tau: v.tau, ki: v.ki }) : await strafRechnen(werte.l1[0]!, werte.l2, { alpha: v.alpha, regel: v.regel, standardisieren: v.standardisieren });
          if (!gilt()) return null;
          ergebnis = (vorhA === 'quantil' ? { typ: 'quantil', e } : { typ: 'penal', e }) as Blatt['ergebnis'];
        } catch (x) { if (!gilt()) return null; mebFehler = (x as Error).message; katFehler = mebFehler; await tick(); document.getElementById('meb-fehler')?.focus(); return null; }
      }
      if (kursA) {
        mebFehler = ''; katFehler = '';
        try {
          const ziel = werte.l1[0]!, praed = werte.l2;
          const e = kursA === 'probit' ? await probitRechnen(ziel, praed) : kursA === 'nls' ? await nlsRechnen(ziel, praed, istNlsArt(z.modell.formel) ? z.modell.formel : '') : await wlsRechnen(ziel, praed, z.modell.zeit);
          if (!gilt()) return null;
          ergebnis = (kursA === 'probit' ? { typ: 'probit', e } : kursA === 'nls' ? { typ: 'nls', e } : { typ: 'wls', e }) as Blatt['ergebnis'];
        } catch (x) { if (!gilt()) return null; mebFehler = (x as Error).message; katFehler = mebFehler; await tick(); document.getElementById('meb-fehler')?.focus(); return null; }
      }
      try {
        if (katA || vorhA || kursA) {
          /* R hat schon gerechnet (oben) */
        } else if (jn) {
          ergebnis = jaNeinErgebnis(jn === 'mcnemar' ? [werte.l1[0]!, werte.l2[0]!] : werte.l1, jaUmkehr);
        } else if (verfahren.id === 'messwiederholung') {
          const k = werte.l1.length, voll = vollstaendig([...werte.l1, ...werte.l2]), fr = werte.l2[0] ? undefined : friedmanAusDaten(werte.l1);   // Friedman als Rangtest-Angebot, nur ohne Gruppen
          ergebnis = { typ: 'messwiederholung', e: messwiederholung(voll.map(z => z.slice(0, k) as number[]), werte.l1, werte.l2[0] ? voll.map(z => z[k]!) : undefined, werte.l2[0], s.zeilen.length), ...(fr ? { rang: fr } : {}) };
        } else if (verfahren.id === 'einzelfall') {
          const au = baueFaelle(einzelfallZeilen(werte), String, v => gruppenName(werte.l4[0]!, v));
          ergebnis = { typ: 'einzelfall', e: einzelfallAus(au.faelle, { mess: werte.l1[0]!, phase: werte.l2[0]!, zeit: werte.l3[0] ?? '', fall: werte.l4[0] ?? '', phasenA: gruppenName(werte.l2[0]!, au.phasenA), phasenB: gruppenName(werte.l2[0]!, au.phasenB), zeilen: s.zeilen.length, ausgelassen: au.ausgelassen }) };
        } else if (verfahren.id === 'zeitreihen') {
          // Später S-E, L7: alles JavaScript; ein früher gewähltes Raster, Fenster, Zerlegungsart und Korrelogramm bleiben beim Neurechnen (nie still zurück auf den Vorschlag)
          const alt = (liveId ? s.blaetter.find(x => x.id === liveId)?.ergebnis : null) as { typ?: string; e?: ZeitreiheE } | null, ae = alt?.typ === 'zeitreihen' && alt.e && alt.e.wert === werte.l1[0] && alt.e.datum === (werte.l2[0] ?? '') ? alt.e : undefined;
          const r = zeitreiheErgebnis(werte.l1[0]!, werte.l2[0] ?? '', { ...(ae ? { raster: ae.rasterGewaehlt ? ae.raster : null, periode: ae.raster === 'zeilen' ? ae.periode : null, fenster: ae.fenster, art: ae.art, acfQuelle: ae.acfQuelle } : {}), ...(werte.l3[0] ? { zweite: werte.l3[0] } : {}) });
          if (!r.ok) return null;
          ergebnis = { typ: 'zeitreihen', e: prognoseBehalten(ae, r.e) };
        } else if (verfahren.id === 'cluster') {
          // Später S-E, S2: Ward (bis 3000 Fälle) oder k-Means rechnet R; Wahlen der Person (Verfahren, Standardisierung, Startwert, k) bleiben beim Neurechnen mit denselben Merkmalen
          mebFehler = ''; katFehler = '';
          const alt = (liveId ? s.blaetter.find(x => x.id === liveId)?.ergebnis : null) as { typ?: string; e?: ClusterE } | null, ae = alt?.typ === 'cluster' && alt.e && alt.e.merkmale.join('\u0000') === werte.l1.join('\u0000') ? alt.e : undefined;
          try {
            const e = await clusterBerechnen(werte.l1, ae ? { verfahren: ae.verfahren === 'kmeans' || clusterVerfahren === 'kmeans' ? 'kmeans' : 'ward', standardisiert: ae.standardisiert, startwert: ae.startwert, k: ae.k } : { verfahren: clusterVerfahren, standardisiert: true });
            if (!gilt()) return null;
            ergebnis = { typ: 'cluster', e };
          } catch (x) { if (!gilt()) return null; mebFehler = (x as Error).message; katFehler = mebFehler; await tick(); document.getElementById('meb-fehler')?.focus(); return null; }
        } else if (verfahren.id === 'armut') {
          // Abschnitt 3: R (survey) rechnet; die Wahl des Anteils des Medians bleibt beim Neurechnen mit denselben Spalten
          mebFehler = ''; katFehler = '';
          const alt = (liveId ? s.blaetter.find(x => x.id === liveId)?.ergebnis : null) as { typ?: string; e?: ArmutE } | null;
          try {
            const e = await armutRechnen(werte.l1[0]!, werte.l2[0]!, werte.l3[0] ?? null, werte.l4[0] ?? null);
            if (!gilt()) return null;
            ergebnis = { typ: 'armut', e: { ...e, anteil: alt?.typ === 'armut' && alt.e && alt.e.einkommen === werte.l1[0] && alt.e.gewicht === werte.l2[0] ? alt.e.anteil : e.anteil } };
          } catch (x) { if (!gilt()) return null; mebFehler = (x as Error).message; katFehler = mebFehler; await tick(); document.getElementById('meb-fehler')?.focus(); return null; }
        } else if (verfahren.id === 'diskriminanz' || verfahren.id === 'loglinear' || verfahren.id === 'manova') {
          // Kurs-Paket: R rechnet; Wahlen der Person (Vorwahrscheinlichkeit, Modell) bleiben beim Neurechnen mit denselben Spalten
          mebFehler = ''; katFehler = '';
          const alt = (liveId ? s.blaetter.find(x => x.id === liveId)?.ergebnis : null) as { typ?: string; e?: DiskrE & LogE } | null;
          try {
            if (verfahren.id === 'diskriminanz') {
              const ae = alt?.typ === 'diskriminanz' && alt.e && alt.e.gruppe === werte.l1[0] && JSON.stringify(alt.e.merkmale) === JSON.stringify(werte.l2) ? alt.e : undefined;
              const e = await diskriminanzRechnen(werte.l1[0]!, werte.l2);
              if (!gilt()) return null;
              ergebnis = { typ: 'diskriminanz', e: { ...e, prior: ae?.prior ?? 'gleich' } };
            } else if (verfahren.id === 'loglinear') {
              const ae = alt?.typ === 'loglinear' && alt.e && JSON.stringify(alt.e.faktoren) === JSON.stringify(werte.l1) && (alt.e.haeuf ?? null) === (werte.l2[0] ?? null) ? alt.e : undefined;
              const e = await loglinearRechnen(werte.l1, werte.l2[0] ?? null, logWahlBereinigen(ae?.wahl, werte.l1.length));
              if (!gilt()) return null;
              ergebnis = { typ: 'loglinear', e };
            } else {
              const e = await manovaRechnen(werte.l2[0]!, werte.l1);
              if (!gilt()) return null;
              ergebnis = { typ: 'manova', e };
            }
          } catch (x) { if (!gilt()) return null; mebFehler = (x as Error).message; katFehler = mebFehler; await tick(); document.getElementById('meb-fehler')?.focus(); return null; }
        } else if (verfahren.id === 'faelle') {
          ergebnis = { typ: 'faelle', e: faelleErgebnisVon(werte, faelleAusDaten(werte)) };   // Gruppen, Notizen und Zitate stehen nicht hier, sondern in blatt.faelle
        } else if (verfahren.id === 'kaplanmeier') {
          const e = kaplanBerechne(werte, kmWahl);
          if (!e) return null;
          const uz = kopiereUeberleben(z.ueberleben);
          if (uz.sterbe.an) {   // Später S-F (A): Sterbetafel (JavaScript); Fehler der Wahl stehen schon in der Prüfliste, hier nur zur Sicherheit
            const st = sterbetafelAusKaplan(e, { breite: zahlFeld(uz.sterbe.breite), ende: zahlFeld(uz.sterbe.ende), einheit: uz.sterbe.einheit });
            if ('fehler' in st) { mebFehler = sterbetafelFehlerSatz(st.fehler); katFehler = mebFehler; await tick(); document.getElementById('meb-fehler')?.focus(); return null; }
            e.sterbe = st;
          }
          if (werte.l4.length) {   // Welle 7, M1: Cox-Regression mit R (survival); schlägt sie fehl, bleibt das Blatt ohne Ergebnis wie bei den Regressionen mit R
            mebFehler = ''; katFehler = '';
            try {
              const ew = e.einWert ? null : kaplanDaten(werte).statusWerte[e.ereignisIndex]?.schluessel ?? null;
              if (uz.zeit.an) {   // Später S-F (A): zeitabhängige Größe - die Zeilen der Tabelle in Intervall-Form gehen als Zahlen nach R
                const zs: ZeitSpalten = { kennung: uz.zeit.kennung, start: uz.zeit.start, stopp: werte.l1[0]!, ereignis: werte.l2[0]!, wert: uz.zeit.wert, fest: werte.l4.filter(n => n !== uz.zeit.wert) };
                const vb = coxZeitVorbereiten(s.zeilen, s.spalten, zs, ew);
                const cx = await coxZpRechnen(vb.zeilen, { wertName: zs.wert, festNamen: zs.fest, faktoren: vb.faktoren });
                if (!gilt()) return null;
                e.coxZeit = { cox: cx, info: coxZeitInfo(vb, zs, cx.n) };
              } else {
              const cox = await coxRechnen(werte.l1[0]!, werte.l2[0]!, ew, werte.l4);
              if (!gilt()) return null;
              e.cox = cox;
              if (uz.aft.an) {   // Später S-F2: AFT-Modell neben der Cox-Regression (Zeit über 0; ohne zeitabhängige Größe)
                const ax = await aftRechnen(werte.l1[0]!, werte.l2[0]!, ew, werte.l4, uz.aft.dist as AftVerteilung);
                if (!gilt()) return null;
                e.aft = ax;
              }
              if (uz.kennung.art !== 'aus' && uz.kennung.spalte) {   // Später S-F2: Cox mit Kennung - die Kennung geht als Ganzzahl-Code nach R
                const fx = await frailtyRechnen(werte.l1[0]!, werte.l2[0]!, ew, uz.kennung.spalte, werte.l4, uz.kennung.art as FrailtyArt, uz.kennung.ties as FrailtyBindung);
                if (!gilt()) return null;
                e.frailty = fx;
              }
              }
            } catch (x) { if (!gilt()) return null; mebFehler = (x as Error).message; katFehler = mebFehler; await tick(); document.getElementById('meb-fehler')?.focus(); return null; }
          }
          ergebnis = { typ: 'kaplanmeier', e };
        } else if (verfahren.id === 'mediation' && z.prozess && z.prozess.modell !== 4 && werte.l4[0]) {
          // Später S-D, G14: bedingte oder serielle Mediation; die Gleichungen kamen von PSPP (items), Effekte und gemeinsamer Bootstrap rechnet Statable (Abbrechen: prozessAbbruch)
          const modell = z.prozess.modell as ProzessModellNr, dt = prozessDatenAus(modell, werte);
          const wm = modell === 6 ? undefined : moderatorWerteWahl(dt.daten.w!, z.prozess.regel, z.prozess.regel === 'eigen' ? eigeneWerte(z.prozess.eigen) ?? [] : []);
          fortschritt = 0; prozessAbbruch = false; const abbruchVorher = abbruchStand();
          const rech = await prozessRechneAsync(modell, dt.daten, { art: z.bootArt === 'bca' ? 'bca' : 'perzentil', wWerte: wm?.werte, regel: wm?.regel, fortschritt: f => (fortschritt = f), abbruch: () => prozessAbbruch || abbruchStand() !== abbruchVorher || !gilt() });
          if (!rech) { if (prozessAbbruch || abbruchStand() !== abbruchVorher) melde(textAbgebrochen()); return null; }
          ergebnis = { typ: 'prozess', e: prozessErgebnis(rech, items, modell === 6 ? { x: werte.l1[0]!, m: werte.l3[0]!, y: werte.l2[0]!, m2: werte.l4[0]! } : { x: werte.l1[0]!, m: werte.l3[0]!, y: werte.l2[0]!, w: werte.l4[0]! }, s.zeilen.length) };
        } else if (verfahren.id === 'mediation') {
          const [x, y, m] = [werte.l1[0]!, werte.l2[0]!, werte.l3[0]!], voll = vollstaendig([x, y, m]);
          fortschritt = 0;
          ergebnis = { typ: 'mediation', e: await mediation(items, x, m, y, { x: voll.map(z => z[0] as number), y: voll.map(z => z[1] as number), m: voll.map(z => z[2] as number) }, s.zeilen.length, f => (fortschritt = f), undefined, undefined, z.bootArt === 'bca' ? 'bca' : 'perzentil') };
        } else if (verfahren.id === 'moderation') {
          const [x, y, w] = [werte.l1[0]!, werte.l2[0]!, werte.l3[0]!], voll = vollstaendig([x, y, w]);
          ergebnis = { typ: 'moderation', e: moderation(items, x, w, y, { x: voll.map(z => z[0] as number), y: voll.map(z => z[1] as number), w: voll.map(z => z[2] as number) }, s.zeilen.length) };
        } else if (verfahren.id === 'praepost') {
          if (konstant(zahlenPaare(werte.l1[0]!, werte.l2[0]!).map(([a, b]) => Number((b - a).toPrecision(12))), [])) ergebnis = ohneStreuungPaar(werte.l1[0]!, werte.l2[0]!);   // keine Streuung: kein t-Test
          else ergebnis = { typ: 'prae-post', e: praePost(items, werte.l1[0]!, werte.l2[0]!), rang: rangAusDaten('prae-post', werte.l1[0]!, werte.l2[0]!) as Wilcoxon ?? undefined, ...praePostZusatz(werte.l1[0]!, werte.l2[0]!, z) };
        } else if (verfahren.id === 'uebereinstimmung') {
          const voll = vollstaendig(werte.l1);
          if (/^CROSSTABS/.test(syntax)) {
            const [na, nb] = werte.l1 as [string, string];
            // Mit Häufigkeitsgewicht rechnet Kappa aus den erweiterten Zeilen (jedes Paar so oft, wie sein Gewicht sagt) - das ist gleichwertig mit PSPP WEIGHT BY
            const paare = gw ? paareGewichtet(na, nb) : voll.map(z => [z[0]!, z[1]!] as [string | number, string | number]);
            const ordnung = ctx.istZahl(na) && ctx.istZahl(nb), stufen = new Set(paare.flat()).size;
            const kp = kappa(items, na, nb, paare, ordnung && stufen >= 3, ordnung && stufen >= 3 && spalteNach(na)?.niveau === 'ordinal' && spalteNach(nb)?.niveau === 'ordinal' ? 'linear' : 'keins');
            let inter: Inter | undefined;
            try { inter = gw ? undefined : interRechnen(werte.l1, kodierungen(werte.l1), interSkala(werte.l1)); } catch { inter = undefined; }   // Zusatz: scheitert er, bleibt Cohens Kappa wie bisher; mit Fallgewicht gibt es ihn nicht
            ergebnis = { typ: 'kappa', e: inter ? { ...kp, inter } : kp };
          } else if (uebereinstimmungsArt(werte.l1, ctx, uebWunsch ?? undefined).art === 'inter') ergebnis = { typ: 'inter', e: interRechnen(werte.l1, kodierungen(werte.l1), interSkala(werte.l1)) };
          else ergebnis = { typ: 'icc', e: iccErgebnis(werte.l1, voll as number[][], s.zeilen.length) };
        } else if (verfahren.id === 'gruppen' && werte.l3.length) {
          const [y, a, b] = [werte.l1[0]!, werte.l2[0]!, werte.l3[0]!], e = anova2(items, anova2Eingabe(y, a, b).d);
          ergebnis = e ? { typ: 'anova2', e: { ...e, yCol: y, aCol: a, bCol: b } } : null;
        } else if (verfahren.id === 'gruppen' && werte.l4.length) {
          const [y, g, x] = [werte.l1[0]!, werte.l2[0]!, werte.l4[0]!];
          if (werte.l4.length > 1) {   // Field-Stufe 2: mehrere Kontrollvariablen, ganz in TypeScript
            const em = ancovaEingabeMehr(y, g, werte.l4), k = em ? kovarianzMehr(em.d) : null;
            ergebnis = k ? { typ: 'ancova', e: { ...k, y, g, x: werte.l4.join(', ') } } : null;
          } else {
            const ein = ancovaEingabe(y, g, x), k1 = ein ? kovarianz(items, ein.d) : null, em = ein ? ancovaEingabeMehr(y, g, [x]) : null, mehr = em ? kovarianzMehr(em.d)?.mehr : undefined;   // `mehr`: die Steigung je Gruppe, falls der Test auffällt
            ergebnis = k1 ? { typ: 'ancova', e: { ...k1, ...(mehr ? { mehr } : {}), y, g, x } } : null;
          }
        } else if (/^T-TEST/.test(syntax)) {
          const e = zweiGruppen(items, werte.l1[0]!, werte.l2[0]!);
          // Nachttest 24.10.: hieß „gw“ und verdeckte das Fallgewicht gw - „!gw“ war damit immer falsch, der Äquivalenztest für zwei Gruppen wurde nie gerechnet
          const gwerte = { [e.a.name]: gruppenFolge[0]![1], [e.b.name]: gruppenFolge[1]![1] };
          const dl = z.tost.an && !gw ? deltaAusText(z.tost.delta) : null, tost = dl === null ? null : tostAusGruppen(gwerte[e.a.name]!, gwerte[e.b.name]!, dl, e.abhaengig, e.a.name, e.b.name);   // G15: Gruppe 1 = die mit dem höheren Mittelwert (e.a)
          ergebnis = { typ: 'zwei-gruppen', e, werte: gwerte, rang: rangAusDaten('zwei-gruppen', werte.l1[0]!, werte.l2[0]!, { a: e.a.name, b: e.b.name, werte: gwerte }) as MannWhitney ?? undefined, ...(tost ? { tost } : {}) };
        } else if (verfahren.id === 'gruppen' && /^ONEWAY/.test(syntax)) {
          ergebnis = { typ: 'anova', e: anova(items, werte.l1[0]!, werte.l2[0]!), rang: rangAusDaten('anova', werte.l1[0]!, werte.l2[0]!) as KruskalWallis ?? undefined };
        } else if (verfahren.id === 'zusammenhang') {
          const emp = empfohleneKorrelation(werte.l1[0]!, werte.l2[0]!, ctx);
          // Eine im Ergebnis gewählte Art (Pearson, Spearman, Kendall) bleibt beim Neurechnen nach einer Änderung der Optionen (zum Beispiel Zufallsverfahren) bestehen - nie still zurück auf den Vorschlag
          const altE = (liveId ? s.blaetter.find(x => x.id === liveId)?.ergebnis : null) as { typ?: string; e?: { x?: string; y?: string; methode?: 'pearson' | 'spearman' | 'kendall'; kontroll?: string[] } } | null;
          const wunsch = !gw && altE?.typ === 'zusammenhang' && altE.e?.x === werte.l1[0] && altE.e?.y === werte.l2[0] && !altE.e?.kontroll?.length === !werte.l3.length ? altE.e?.methode : undefined;
          const art = wunsch && (!werte.l3.length || wunsch !== 'kendall') ? wunsch : emp.methode;
          const part = werte.l3.length ? zusammenhangPartial(werte.l1[0]!, werte.l2[0]!, werte.l3, zahlenZeilenMitLuecken([werte.l1[0]!, werte.l2[0]!, ...werte.l3]), art === 'kendall' ? emp.methode : art, emp.grund) : null;
          if (werte.l3.length && !part) throw new Error('Partialkorrelation nicht rechenbar');
          const basis = part ?? zusammenhang(items, werte.l1[0]!, werte.l2[0]!, gw ? undefined : zahlenPaare(werte.l1[0]!, werte.l2[0]!), emp.methode, emp.grund);
          ergebnis = { typ: 'zusammenhang', e: !part && art !== emp.methode ? zusammenhangMit(basis, art) : basis };   // mit Fallgewicht nur Pearson aus PSPP (Spearman und Kendall zählen jede Zeile einmal)
        } else if (verfahren.id === 'korrmatrix') {
          const emp = empfohleneKorrelationListe(werte.l1, ctx);
          ergebnis = { typ: 'korrmatrix', e: korrMatrix(werte.l1, zahlenZeilenMitLuecken(werte.l1), { methode: emp.methode, grund: emp.grund }) };
        } else if (verfahren.id === 'vorhersage' && ctx.verschieden(werte.l1[0]!) !== 2 && hierTerme(werte.l2, z)) {
          const bt = hierTerme(werte.l2, z)!;
          ergebnis = { typ: 'hierreg', e: { ...hierreg(items, werte.l1[0]!, bt), luecken: hierLuecken(werte.l1[0]!, bt) } };
        } else if (verfahren.id === 'vorhersage') { const terme = regTerme(werte.l2, ctx.faktor); ergebnis = ctx.verschieden(werte.l1[0]!) === 2 ? { typ: 'logistik', e: logistik(items, werte.l1[0]!, ctx.logistik(werte.l1[0]!)!, terme) } : { typ: 'vorhersage', e: vorhersage(items, werte.l1[0]!, terme) }; }
        else if (verfahren.id === 'skala') { const sk = skala(items), ik = itemKarteVon(werte.l1); itemZeilenkoepfe(items, ik); for (const q of sk.fragen) q.name = itemNamen([q.name], ik)[0]!; ergebnis = { typ: 'skala', e: sk }; }
        else if (verfahren.id === 'faktor') {
          const fe = faktoren(faktorTabellenBereinigen(items), werte.l1.map(n => [n, name(n)] as [string, string]), faWahl.zahl);
          faktorLadungenAusblenden(items, faWahl.grenze); fe.grenze = faWahl.grenze;
          const ik = itemKarteVon(werte.l1); itemZeilenkoepfe(items, ik);
          for (const f of fe.faktoren) for (const q of f.fragen) q.name = itemNamen([q.name], ik)[0]!;
          fe.doppelt = itemNamen(fe.doppelt, ik); fe.ohne = itemNamen(fe.ohne, ik); if (fe.ausgelassen) fe.ausgelassen = itemNamen(fe.ausgelassen, ik);
          if (gw) { delete fe.parallel; fe.parallelAus = true; }   // Sperrtabelle `faktor:parallel`: die Parallelanalyse simuliert Stichproben aus den Zeilen und kennt das Fallgewicht nicht - mit Fallgewicht entfällt sie
          ergebnis = { typ: 'faktor', e: fe };
        }
        else if (verfahren.id === 'kreuz') {
          const m = istSetName(werte.l1[0] ?? '') ? mehrfachFuer(werte.l1[0]!, werte.l2[0]) : null;
          if (m) ergebnis = { typ: 'mehrfach', e: m };
          else {
            const e: Kreuz = { ...kreuz(items), ...(z.design === 'fallKontrolle' ? { studie: 'fallKontrolle' as const } : {}) };
            // Später S-B: Stärke des Zusammenhangs (PSPP rechnet mit allen Maßen) und Aufteilung nach einer dritten Spalte (Mantel-Haenszel, JavaScript)
            if (masseAn(z)) {
              try {
                const mi = await rechne((gw ? gewichtBefehl(gw) + '\n' : '') + masseBefehl(werte.l2[0]!, werte.l1[0]!));
                if (!gilt()) return null;
                e.masse = { ergebnis: rechneMasse(mi, e.zaehlung!.tab, { zeile: werte.l2[0]!, spalte: werte.l1[0]!, zeileLabel: e.gruppen, spalteLabel: e.gezaehlt }), arten: [...z.masse!.arten] };
              } catch (x) { if (x instanceof EngineAbgebrochen) return null; if (import.meta.env.DEV) console.warn('Maße konnten nicht gelesen werden:', x); }
            }
            if (z.schicht) { const sd = schichtFuer(e, werte.l2[0]!, werte.l1[0]!, z.schicht, gw ? gewichtLageW() : null); if (sd) e.schicht = sd; }
            ergebnis = { typ: 'kreuz', e };
          }
        } else if (verfahren.id === 'verteilung') {
          const mf = werte.l1.filter(istSetName).flatMap(n => mehrfachFuer(n) ?? []);
          ergebnis = { typ: 'verteilung', e: nurSets ? verteilungNurSets(mf) : mitGetrimmtem(werte.l1, mitNormalitaet(werte.l1, mf.length ? { ...verteilung(items), mehrfach: mf } : verteilung(items), !!gw), gw && gw.art === 'haeufigkeit' && gewichtLage().art === 'gilt' ? (gewichtLage() as { pruefung: { w: number[] } }).pruefung.w : null) };   // mit Fallgewicht ohne Shapiro-Wilk und Lilliefors: sie zählen jede Zeile einmal
        }
      } catch (fehler) {
        if (import.meta.env.DEV) console.warn('Ergebnis konnte nicht gelesen werden:', fehler);
        // Spalte ohne Streuung: PSPP liefert NaN. Dann ein kurzer Satz statt keinem (Prüfrunde 07.10., Befund C7); andere Fehler bleiben still.
        const tTest = verfahren.id === 'gruppen' && /^T-TEST/.test(syntax), kandidaten = tTest ? [werte.l1[0]] : verfahren.id === 'zusammenhang' ? [werte.l1[0], werte.l2[0]] : [];
        const k = kandidaten.find(n => n && spalteNach(n) && konstant(spaltenWerte(n), fehlendMenge(spalteNach(n))));
        // Gepaart: gleiche Veränderung bei allen Personen => keine Streuung der Unterschiede.
        const gleicheVeraenderung = verfahren.id === 'praepost' && konstant(zahlenPaare(werte.l1[0]!, werte.l2[0]!).map(([a, b]) => Number((b - a).toPrecision(12))), []);
        ergebnis = verfahren.id === 'messwiederholung' ? { typ: 'ohne-streuung', art: 'messwiederholung', spalte: '' } : verfahren.id === 'uebereinstimmung' ? { typ: 'ohne-streuung', art: 'uebereinstimmung', spalte: '' } : gleicheVeraenderung ? ohneStreuungPaar(werte.l1[0]!, werte.l2[0]!) : k ? { typ: 'ohne-streuung', art: tTest ? 'zwei-gruppen' : 'zusammenhang', spalte: k } : null;
      }
      if (!gilt()) return null;
      const blatt: Blatt = { id: Math.random().toString(36).slice(2, 8), titel: verfahren.titelBlatt(werte, spalteNach, verfahren.id === 'mediation' && z.prozess ? { ...ctx, prozess: z.prozess.modell } : ctx), art: verfahren.id, l1: werte.l1[0] ?? null, l2: werte.l2[0] ?? null, l3: verfahren.id === 'faelle' ? [werte.l3[0] ?? '', ...werte.l1, '', ...werte.l2] : verfahren.id === 'kaplanmeier' ? [werte.l1[0]!, werte.l2[0]!, werte.l3[0] ?? '', ...werte.l4] : verfahren.id === 'gruppen' && (werte.l3.length || werte.l4.length) ? [werte.l1[0]!, werte.l2[0]!, werte.l3[0] ?? '', werte.l4[0] ?? ''] : verfahren.id === 'einzelfall' || verfahren.id === 'armut' ? [werte.l1[0]!, werte.l2[0]!, werte.l3[0] ?? '', werte.l4[0] ?? ''] : verfahren.id === 'zeitreihen' ? zeitreiheSpalten(werte) : [...werte.l1, ...werte.l2, ...werte.l3, ...werte.l4], syntax: gw && items.length ? gewichtBefehl(gw) + '\n' + syntax : syntax, items, ergebnis, imBericht: true, notiz: '', zeit: Date.now(), ...(kursZiel ? { kursZiel } : {}) };
      if (gw) blatt.gewicht = gw;
      if (zusatzAn(z)) blatt.zus = kopiereZusatz(z);
      blatt.stand = standFuer(werte);
      return blatt;
    }
  }
  /** Knopf „Rechnen“ (Sofort rechnen aus) und „Neu rechnen mit …“ im Skala-Blatt: rechnet und legt ein neues Blatt an. */
  async function blattRechnen(verfahren: Verfahren, werte: Werte, syntax: string) {
    rechnet = true;
    try { const b = await berechneBlatt(verfahren, werte, syntax); if (b) anlegen(b); } finally { rechnet = false; }
  }
  /** Ein fertiges Blatt ins Heft legen und öffnen. */
  function anlegen(b: Blatt) {
    s.blaetter = [...s.blaetter, b];
    zaehle('verfahren', b.art);
    sichern();
    liveId = b.id; gerechnetKey = editorKey ?? '';
    rechner.uebernimm(editorKey);
    location.hash = 'blatt/' + b.id;
    setTimeout(() => { document.getElementById('f3-t')?.focus(); }, 120);
  }

  /* ---------- Fertiges Blatt ---------- */
  const blatt = $derived(s.blaetter.find(b => b.id === id) ?? null);
  setContext('dgBlatt', () => blatt);   // S-G: Diagramme gestalten speichert am Blatt
  /** Übungsmodus: welche Blätter ihre Deutung schon gezeigt haben (nur diese Sitzung). */
  let deutungGezeigt = $state<Record<string, boolean>>({});
  const erg = $derived(blatt?.ergebnis as null | { typ: 'zeitreihen'; e: ZeitreiheE } | { typ: 'cluster'; e: ClusterE } | { typ: 'diskriminanz'; e: DiskrE } | { typ: 'loglinear'; e: LogE } | { typ: 'manova'; e: ManovaE } | { typ: 'armut'; e: ArmutE } | { typ: 'probit'; e: ProbitE } | { typ: 'wls'; e: WlsE } | { typ: 'nls'; e: NlsE } | { typ: 'zwei-gruppen'; e: ZweiGruppen; werte: Record<string, number[]>; rang?: MannWhitney; tost?: TostAnzeige } | { typ: 'anova'; e: Anova; rang?: KruskalWallis } | { typ: 'zusammenhang'; e: Zusammenhang } | { typ: 'vorhersage'; e: Vorhersage } | { typ: 'hierreg'; e: Hierreg } | { typ: 'ordreg'; e: OrdReg } | { typ: 'multreg'; e: MultReg } | { typ: 'zaehlreg'; e: ZaehlReg } | { typ: 'quantil'; e: QuantilErgebnis } | { typ: 'penal'; e: StrafErgebnis } | { typ: 'logistik'; e: Logistik } | { typ: 'skala'; e: Skala } | { typ: 'faktor'; e: Faktoren } | { typ: 'kreuz'; e: Kreuz } | { typ: 'verteilung'; e: Verteilung } | { typ: 'prae-post'; e: PraePost; rang?: Wilcoxon; tost?: TostAnzeige; rci?: RciAnzeige } | { typ: 'kappa'; e: Kappa } | { typ: 'inter'; e: Inter } | { typ: 'icc'; e: IccErgebnis } | { typ: 'messwiederholung'; e: Messwiederholung; rang?: Friedman } | { typ: 'mcnemar'; e: McNemarE } | { typ: 'cochran'; e: CochranE } | { typ: 'mediation'; e: Mediation } | { typ: 'prozess'; e: Prozess } | { typ: 'moderation'; e: Moderation } | { typ: 'einzelfall'; e: Einzelfall } | { typ: 'mehrebenen'; e: Mehrebenen } | { typ: 'meta'; e: Meta } | { typ: 'faelle'; e: FaelleErgebnis } | { typ: 'kaplanmeier'; e: Kaplan } | { typ: 'mehrfach'; e: Mehrfach } | { typ: 'korrmatrix'; e: KorrMatrix } | { typ: 'anova2'; e: Anova2E } | { typ: 'ancova'; e: AncovaE } | { typ: 'ohne-streuung'; art: 'zwei-gruppen' | 'zusammenhang' | 'prae-post' | 'uebereinstimmung' | 'messwiederholung'; spalte: string; rang?: Wilcoxon; grund?: 'einPaar' | 'keinUnterschied' } | { typ: 'gewichtet'; e: GewichtetE });
  const saetze = $derived(blatt ? saetzeZu(blatt) : null);
  /** Der Satz, mit dem ein Teil gesperrt ist, wenn das Blatt mit Fallgewicht gerechnet wurde (Diagramme aus einzelnen Zeilen, Rangtests, ROC); sonst `null`. */
  const gwSatz = (id: string): string | null => (blatt?.gewicht ? sperrSatz(id, blatt.gewicht, stellenTitel(id)) : null);
  /** Der Rangtest dieses Blatts, wenn gewählt (Mann-Whitney, Kruskal-Wallis, Wilcoxon). */
  const rangBlatt = $derived(blatt ? rangVon(blatt) : null);
  /** Rangtest aus den Daten rechnen (für Blätter, die ihn noch nicht haben: alte Projekte). */
  const rangNeu = (): RangErgebnis | null => erg?.typ === 'zwei-gruppen' ? rangAusDaten('zwei-gruppen', erg.e.abhaengig, erg.e.gruppenSpalte, { a: erg.e.a.name, b: erg.e.b.name, werte: erg.werte })
    : erg?.typ === 'anova' ? rangAusDaten('anova', erg.e.abhaengig, erg.e.gruppenSpalte) : erg?.typ === 'prae-post' ? rangAusDaten('prae-post', erg.e.vorher, erg.e.nachher)
    : erg?.typ === 'messwiederholung' && !erg.e.gruppenSpalte ? friedmanAusDaten(erg.e.zeitpunkte) ?? null : null;
  /** Welle S-B: die weiteren Rangtests (Vorzeichen, Median, Jonckheere-Terpstra, Kolmogorov-Smirnov) aus den Daten der Tabelle; `null`, wenn der Test nicht geht. Wirft nie.
   *  `e` ist das Ergebnis des Blatts (Auswahl der Spalten und Gruppen); mit Fallgewicht gesperrt (Schlüssel `gruppen:rang-weitere`, `praepost:vorzeichen`). */
  function weitereAusErgebnis(e: unknown, b: Blatt | undefined, art: WeitereArt, opt: JtWahl = {}): RangErgebnis | null {
    if (aktivesGewicht()) return null;
    const x = e as { typ?: string; art?: string; e?: { vorher?: string; nachher?: string; abhaengig?: string; gruppenSpalte?: string; a?: { name: string }; b?: { name: string } }; werte?: Record<string, number[]> } | null;
    try {
      if (art === 'vorzeichen') {
        const [vor, nach] = x?.typ === 'prae-post' ? [x.e!.vorher!, x.e!.nachher!] : x?.typ === 'ohne-streuung' && x.art === 'prae-post' && b?.l1 && b?.l2 ? [b.l1, b.l2] : [undefined, undefined];
        return vor && nach ? vorzeichenErgebnis(vor, nach, zahlenPaare(vor, nach), stufenGrund([vor, nach], ctx)) : null;
      }
      if (x?.typ !== 'zwei-gruppen' && x?.typ !== 'anova') return null;
      const y = x.e!.abhaengig!, g = x.e!.gruppenSpalte!, stufen = stufenGrund([y], ctx);
      let liste: GruppeEin[] = gruppenWerteListe(g, y);
      if (x.typ === 'zwei-gruppen' && liste.length !== 2 && x.werte && x.e!.a && x.e!.b) liste = [x.e!.a.name, x.e!.b.name].map(n => ({ wert: n, name: n, werte: x.werte![n] ?? [] }));
      if (art === 'median') return medianErgebnis(y, g, liste, stufen);
      if (art === 'jt') return jtErgebnis(y, g, liste, opt, stufen);
      return liste.length === 2 ? ksErgebnis(y, g, liste[0]!, liste[1]!, stufen) : null;
    } catch { return null; }
  }
  const weitereRang = (art: WeitereArt, opt: JtWahl = {}): RangErgebnis | null => weitereAusErgebnis(blatt?.ergebnis, blatt ?? undefined, art, opt);
  /** Nach dem Neurechnen (Sofort rechnen) gilt der gewählte weitere Rangtest weiter: Statable wechselt nie von selbst zurück. */
  function rangArtErneuern(b: Blatt) {
    if (!b.rang || !b.rangArt) return;
    const x = weitereAusErgebnis(b.ergebnis, b, b.rangArt, b.rangOpt ?? {});
    if (x) b.ergebnis = { ...(b.ergebnis as object), rang: x } as Blatt['ergebnis']; else { b.rangArt = undefined; b.rangOpt = undefined; }
  }
  /** Die Auswahl des fertigen Blatts: `l3` hält alle Spalten, zuerst die der ersten Lücke (bei diesen Arten genau eine). */
  const gewaehlt = $derived(blatt ? werteVon(blatt) : { l1: [], l2: [], l3: [], l4: [] });
  /** Vorschläge unter dem Ergebnis der linearen Regression (ordinales Ziel, Zählwerte): dieselben wie in der Prüfliste, damit sie auch bei „Sofort rechnen“ zu sehen sind. */
  const katVorschlagErgebnis = $derived(blatt && erg?.typ === 'vorhersage' && gewaehlt.l1[0] ? katVorschlaege(gewaehlt.l1[0], gewaehlt.l2, s.zeilen, s.spalten, name) : []);
  /** Hinweis auf eine Gruppierung im Ergebnis von „Unterscheiden sich Gruppen?“ und „Lässt sich etwas vorhersagen?“ */
  const ebenenErgebnis = $derived(blatt && (erg?.typ === 'zwei-gruppen' || erg?.typ === 'anova' || erg?.typ === 'vorhersage') ? ebenenFuer(blatt.art, gewaehlt) : null);
  /** Erste Zahlenspalte unter den Vorhersagegrößen der Regression: x für das Streudiagramm nach Gruppe. */
  const regStreuX = $derived(werte.l2.find(n => s.spalten.find(c => c.name === n)?.art === 'zahl') ?? '');
  const punkte = $derived.by((): [number, number][] => {
    if (erg?.typ === 'prae-post') return zahlenPaare(erg.e.vorher, erg.e.nachher);
    if (erg?.typ !== 'zusammenhang') return [];
    if (erg.e.kontroll?.length) return partialPunkte(zahlenZeilenMitLuecken([erg.e.x, erg.e.y, ...erg.e.kontroll]), erg.e.methode === 'spearman' ? 'spearman' : 'pearson');
    return zahlenPaare(erg.e.x, erg.e.y);
  });
  /** Übereinstimmung: Name einer Kategorie (Wertebeschriftung der ersten, sonst der zweiten Spalte, sonst der Wert selbst). */
  const katName = (w: string | number) => (erg?.typ === 'kappa' ? (spalteNach(erg.e.a)?.werteLabels[String(w)] ?? spalteNach(erg.e.b)?.werteLabels[String(w)] ?? gruppenName(erg.e.a, w)) : String(w));
  /** ICC: die vollständigen Fälle als Zahlenmatrix, für das Diagramm. */
  const iccDaten = $derived(erg?.typ === 'icc' ? (vollstaendig(erg.e.spalten) as number[][]) : []);
  /** Bland-Altman (zwei Zahlenspalten): die Punkte aus denselben vollständigen Fällen wie der ICC. */
  const baDaten = $derived(erg?.typ === 'icc' && erg.e.ba ? baPunkte(iccDaten.map(z => [z[0]!, z[1]!] as [number, number])) : []);
  /** Kreuztabelle 2 × 2 als Test gegen einen Referenzstandard: Wahl setzen oder abwählen. */
  /** Welle 7, M2: die Rollen für die Risikomaße setzen (oder ausblenden). */
  function setzeRisiko(w: RisikoWahl | null) {
    if (erg?.typ !== 'kreuz' || !blatt) return;
    const e: Kreuz = { ...erg.e }; if (w) e.risiko = w; else delete e.risiko;
    blatt.ergebnis = { typ: 'kreuz', e }; sichern();
  }
  /** Später S-B, M3: Rollen oder Stetigkeitskorrektur des Mantel-Haenszel-Tests ändern (die Zählungen je Schicht bleiben). */
  function setzeSchicht(p: Partial<SchichtDaten>) {
    if (erg?.typ !== 'kreuz' || !blatt || !erg.e.schicht) return;
    blatt.ergebnis = { typ: 'kreuz', e: { ...erg.e, schicht: { ...erg.e.schicht, ...p } } }; sichern();
  }
  function setzeDiagnose(w: DiagnoseWahl | null) {
    if (erg?.typ !== 'kreuz' || !blatt) return;
    const e: Kreuz = { ...erg.e }; if (w) e.diagnose = w; else delete e.diagnose;
    blatt.ergebnis = { typ: 'kreuz', e }; sichern();
  }
  /** ROC-Befehl für „zwei Gruppen“: positiv ist die Gruppe mit dem höheren Mittelwert (dann sprechen hohe Werte für „positiv“). */
  const rocText = $derived.by(() => {
    if (erg?.typ !== 'zwei-gruppen') return null;
    const e = erg.e, g = e.gruppenSpalte, iv = idx(g), hoch = e.a.m >= e.b.m ? e.a : e.b;
    const roh = [...new Set(s.zeilen.map(z => z[iv]).filter((v): v is string | number => v !== null && v !== undefined))].find(r => gruppenName(g, r) === hoch.name);
    return roh === undefined ? null : { befehl: rocBefehl(e.abhaengig, g, roh, true), positiv: hoch.name };
  });
  /** Kurve und bester Schwellenwert aus den Rohwerten der beiden Gruppen (die Gruppe mit dem höheren Mittelwert ist positiv). */
  const rocDaten = $derived.by(() => {
    if (erg?.typ !== 'zwei-gruppen' || !rocText) return null;
    const pos = erg.werte[rocText.positiv], neg = erg.werte[rocText.positiv === erg.e.a.name ? erg.e.b.name : erg.e.a.name];
    return pos && neg ? rocKurve(pos, neg) : null;
  });
  /** AUC zu „zwei Gruppen“: wird gerechnet, sobald der Zusatz aufgeklappt wird. */
  let roc = $state<{ schluessel: string; a: Auc | null } | null>(null);
  async function rocRechne() {
    const k = rocText && (blatt?.id ?? '') + rocText.befehl; if (!k || roc?.schluessel === k) return;
    try { roc = { schluessel: k, a: aucAus(await rechne(rocText!.befehl)) }; } catch { roc = { schluessel: k, a: null }; }
  }
  /** Spalten mit genau zwei Werten (Kontroll-/Versuchsgruppe), für den ANCOVA-Hinweis im Vorher-Nachher-Blatt. */
  /** Prä-Post: Spalten, die eine Kontroll- und eine Versuchsgruppe nennen könnten (2 bis 12 Gruppen; Text, beschriftet oder genau zwei Werte) - für den Weg zur Kovarianzanalyse. */
  const ancovaKandidaten = $derived.by(() => {
    if (erg?.typ !== 'prae-post') return [];
    const aus = [erg.e.vorher, erg.e.nachher];
    return s.spalten.filter(sp => { const n = ctx.verschieden(sp.name); return !aus.includes(sp.name) && !kennung(sp) && sp.art !== 'datum' && n >= 2 && n <= 12 && (n === 2 || sp.art === 'text' || Object.keys(sp.werteLabels ?? {}).length > 0); }).slice(0, 4).map(sp => sp.name);
  });
  /** Zur Kovarianzanalyse: „Unterscheiden sich Gruppen?“ mit nachher als Messwert, der Gruppe und vorher als Kontrollvariable (Nachttest 24.10.: vorher stand hier ein REGRESSION-Befehl aus der Zeit vor der eingebauten Kovarianzanalyse). */
  /** „Weiter mit …“ → Anders rechnen: Schritt 1 und darin „Weitere Wege“ öffnen, zum Kästchen des Äquivalenztests bzw. des Reliable Change Index springen und es fokussieren. */
  function zuWeitereWege(ziel: 'tost' | 'rci') {
    const fa = document.querySelector<HTMLDetailsElement>('details.frage-aendern'); if (fa) fa.open = true;
    const ww = document.querySelector<HTMLDetailsElement>('details.frage-aendern details.weitere-wege'); if (ww) ww.open = true;
    let versuche = 0;   // die Details klappen animiert auf: erst wenn das Kästchen sichtbar ist, lässt es sich fokussieren
    const los = () => {
      const el = document.getElementById(ziel === 'tost' ? 'zus-tost-an' : 'zus-rci-an') as HTMLInputElement | null; if (!el) return;
      if (el.checkVisibility?.() === false && ++versuche < 30) { setTimeout(los, 50); return; }
      el.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      el.focus({ preventScroll: true });
    };
    requestAnimationFrame(los);
  }
  function zurAncova(vorher: string, nachher: string, gruppe: string) {
    frageVorschlag.v = { art: 'gruppen', w: { l1: [nachher], l2: [gruppe], l3: [], l4: [vorher] } };
    location.hash = 'blatt/neu';
  }
  const vf = $derived(VERFAHREN.find(v => v.id === blatt?.art));
  /** Zu den Sätzen nur die Tabellen, die sie belegen; alle anderen stehen weiter unten bei „Weitere Auswertungen". */
  const BELEG: Record<string, RegExp> = { vorhersage: /^(Model Summary|Coefficients)/, logistik: /^(Model Summary|Variables in the Equation)/, skala: /^(Reliability Statistics|Item-Total Statistics)$/, faktor: /^(Rotated Component Matrix|Rotated Factor Matrix|Total Variance Explained)$/ };
  /** Die Mehrfachantworten-Ergebnisse dieses Blatts (ein Set mit Kreuztabelle oder mehrere Sets in der Verteilung). */
  const mfListe = $derived<Mehrfach[]>(erg?.typ === 'mehrfach' ? [erg.e] : erg?.typ === 'verteilung' ? erg.e.mehrfach ?? [] : []);
  function mfSpeichern(neu: Mehrfach[]) {
    if (!blatt || !erg) return;
    if (erg.typ === 'mehrfach') blatt.ergebnis = { typ: 'mehrfach', e: neu[0]! };
    else if (erg.typ === 'verteilung') blatt.ergebnis = { typ: 'verteilung', e: { ...erg.e, mehrfach: neu } };
    sichern();
  }
  const mfNeuRechnenMoeglich = $derived(mfListe.length > 0 && mfListe.every(m => !!mehrfachFuer(m.set, m.gruppe?.spalte, m.mitNull)));
  function mfSortiert(an: boolean) { mfSpeichern(mfListe.map(m => ({ ...m, sortiert: an }))); melde(an ? L('Nach Häufigkeit sortiert.', 'Sorted by frequency.') : L('In der Reihenfolge der Spalten.', 'In the order of the columns.')); }
  function mfMitNullSetzen(an: boolean) {
    const neu = mfListe.map(m => { const r = mehrfachFuer(m.set, m.gruppe?.spalte, an); return r ? { ...r, sortiert: m.sortiert } : m; });
    mfSpeichern(neu);
    melde(an ? L('Fälle ohne Ankreuzung zählen jetzt mit.', 'Cases without a check are now included.') : L('Nur Fälle mit mindestens einer Ankreuzung zählen.', 'Only cases with at least one check count.'));
  }
  const belegTabellen = $derived(blatt && (erg?.typ === 'kreuz' || erg?.typ === 'verteilung' || erg?.typ === 'anova' || erg?.typ === 'mehrfach' || erg?.typ === 'korrmatrix' || erg?.typ === 'inter' || erg?.typ === 'hierreg' || erg?.typ === 'ordreg' || erg?.typ === 'multreg' || erg?.typ === 'zaehlreg' || erg?.typ === 'quantil' || erg?.typ === 'penal' || erg?.typ === 'gewichtet' || erg?.typ === 'zeitreihen' || erg?.typ === 'cluster' || erg?.typ === 'diskriminanz' || erg?.typ === 'loglinear' || erg?.typ === 'manova' || erg?.typ === 'armut' || erg?.typ === 'probit' || erg?.typ === 'wls' || erg?.typ === 'nls') ? berichtTabellenVorschlag(blatt) : blatt && erg && BELEG[erg.typ] ? ersteJe(blatt.items.filter((i): i is TableItem => i.type === 'table' && BELEG[erg.typ]!.test(i.label))) : []);
  /** Diese Ergebnisse zeigen ihre Tabellen schon unter „Ergebnis“; unter „Für deine Arbeit“ stehen sie dann nicht noch einmal. */
  const tabellenImErgebnis = $derived(belegTabellen.length > 0 && !!erg && ['kreuz', 'verteilung', 'anova', 'vorhersage', 'hierreg', 'ordreg', 'multreg', 'zaehlreg', 'quantil', 'penal', 'logistik', 'skala', 'faktor', 'mehrfach', 'korrmatrix', 'inter', 'gewichtet', 'zeitreihen', 'cluster', 'diskriminanz', 'loglinear', 'manova', 'armut', 'probit', 'wls', 'nls'].includes(erg.typ));
  /** „Weitere Auswertungen“ (Johannes 01.11.): alles, was die Engine noch gerechnet hat und oben (Ergebnis, Für deine Arbeit) nicht schon steht. Gleich ist eine Tabelle, wenn Name und Zellen gleich sind. */
  const tabSchluessel = tabellenSchluessel;
  const weitereAusgabe = $derived.by(() => {
    if (!blatt) return [];
    const oben = new Set<string>();
    for (const t of berichtTabellenVorschlag(blatt)) oben.add(tabSchluessel(t));
    for (const t of belegTabellen) oben.add(tabSchluessel(t));
    return blatt.items.filter(i => i.type === 'table' ? !oben.has(tabSchluessel(i)) : i.type === 'message');
  });
  /** Messwiederholung (Varianzanalyse) und Einzelfall (NAP und PND): die Haupttabelle offen, die übrigen unter „Weitere Tabellen“. */
  const mwTabellen = $derived.by(() => { if ((erg?.typ !== 'messwiederholung' && erg?.typ !== 'einzelfall' && erg?.typ !== 'kaplanmeier') || !blatt || rangBlatt) return null; const t = berichtTabellenVorschlag(blatt); const h = erg.typ === 'einzelfall' ? 1 : erg.typ === 'kaplanmeier' ? 0 : t.length - 2; if (t.length < 2) return null; const cox = erg.typ === 'kaplanmeier' && erg.e.cox ? t.findIndex(x => x.label === 'Cox Regression') : -1;   /* Welle 7: bei der Cox-Regression steht die Tabelle der Hazard Ratios neben der Medianzeit-Tabelle */ /* S-F2 Prüfung N4: beim AFT-Modell und bei der Kennung stehen ihre Koeffiziententabellen auch offen (nicht unter „Weitere Tabellen“), gefunden am Namen der Tabelle */
    if (erg.typ === 'kaplanmeier' && (erg.e.aft || erg.e.frailty)) { const offen = (x: TableItem, i: number) => i === h || (cox >= 0 && i === cox) || /^(AFT Model|Cox Cluster|Cox Frailty)$/.test(x.label); return { haupt: t.filter(offen), rest: t.filter((x, i) => !offen(x, i)) }; }
    return { haupt: cox >= 0 ? [t[h]!, t[cox]!] : [t[h]!], rest: t.filter((_, i) => i !== h && i !== cox) }; });
  /* ---------- Skala: umpolen und Skalenwert ---------- */
  /** Die Spalten der Skala in der Reihenfolge der Item-Tabelle (die zeigt Bezeichnungen, nicht Namen). */
  const skalaFragen = $derived(erg?.typ === 'skala' ? (blatt?.l3 ?? []) : []);
  const umzupolen = $derived(erg?.typ === 'skala' ? erg.e.fragen.flatMap((f, i) => (f.trennschaerfe < 0 && skalaFragen[i] ? [skalaFragen[i]!] : [])) : []);
  /** Die schon angelegte umgepolte Spalte (FG76 → FG76R), falls es sie gibt. */
  const umgepolteSpalte = (n: string) => s.spalten.find(x => x.name.toUpperCase() === `${n}R`.toUpperCase())?.name;
  let swName = $state(''), swFehler = $state(''), swFertig = $state(''), swMinEigen = $state<number | null>(null);
  /** Später S-C (Entscheidung Opus 5): ein NEU angelegter Skalenwert braucht in der Voreinstellung mindestens die Hälfte der Fragen; gespeicherte Befehle bleiben unverändert. */
  const swMin = $derived(swMinEigen ?? Math.max(1, Math.ceil(skalaFragen.length / 2)));
  /** Wie viele gültige Antworten je Person (für „mindestens … beantwortet“, Prüfung C3). */
  const swAntworten = $derived.by(() => {
    if (erg?.typ !== 'skala' || !skalaFragen.length) return [];
    const sp = skalaFragen.map(f => ({ i: idx(f), fehl: fehlendMenge(spalteNach(f)) }));
    return s.zeilen.map(z => sp.filter(({ i, fehl }) => { const v = z[i]; return typeof v === 'number' && Number.isFinite(v) && !fehl.includes(v); }).length);
  });
  const swLuecke = $derived(swAntworten.filter(n => n > 0 && n < skalaFragen.length).length);
  const swOhne = $derived(swAntworten.filter(n => n > 0 && n < swMin).length);
  const swVorschlag = $derived(freierName(L('SKALENWERT', 'SCALESCORE'), s.spalten.map(x => x.name)));
  async function ausfuehrenMitRueck(text: string, syntax: string) {
    const r = await aendere(text, syntax);
    if (r.items.some(i => i.type === 'message' && i.severity === 'error')) { await rueckgaengig(); meldeFehler(L('Das ging nicht. Es ist alles wie vorher.', "That didn't work. Everything is as it was before.")); return false; }
    return true;
  }
  /** Antwortskala fürs Umpolen: aus den Wertelabels, sonst aus den Antworten ALLER Fragen der Skala (C1: fehlt bei einer Frage die 5, bleibt die Skala 1-5).
   *  Steht sichtbar über dem Knopf und lässt sich ändern - Statable rät nie still. */
  const umpolVorschlag = $derived.by(() => {
    if (!umzupolen.length) return null;
    const sp = spalteNach(umzupolen[0]!); if (!sp) return null;
    const alle = skalaFragen.flatMap(f => { const i = idx(f); return i < 0 ? [] : s.zeilen.map(z => z[i] ?? null); });
    const r = umpolSpanne(sp, alle); return Number.isFinite(r.min) ? r : null;
  });
  let umpolVon = $state<number | null>(null), umpolBis = $state<number | null>(null);
  const umpolFest = $derived({ min: umpolVon ?? umpolVorschlag?.min ?? NaN, max: umpolBis ?? umpolVorschlag?.max ?? NaN });
  async function umpolen(n: string) {
    const sp = spalteNach(n); if (!sp || s.arbeitet) return;
    const u = umpolBefehl(sp, spaltenWerte(n).map(v => v ?? null), s.spalten.map(x => x.name), umpolFest);
    if (!Number.isFinite(u.min) || !Number.isFinite(u.max) || u.min >= u.max) { melde(L(`${name(n)} hat keine Spanne zum Umpolen.`, `${name(n)} has no range to reverse.`)); return; }
    if (await ausfuehrenMitRueck(L(`${n} umgepolt als ${u.neu}`, `${n} reverse-coded as ${u.neu}`), u.syntax))
      melde(L(`Neue Spalte ${u.neu}: aus ${u.max} wird ${u.min}, aus ${u.min} wird ${u.max}.`, `New column ${u.neu}: ${u.max} becomes ${u.min}, ${u.min} becomes ${u.max}.`), true);
  }
  function mitUmgepolten() {
    const v = VERFAHREN.find(x => x.id === 'skala')!;
    const w: Werte = { l1: skalaFragen.map(n => (umzupolen.includes(n) ? umgepolteSpalte(n) ?? n : n)), l2: [], l3: [], l4: [] };
    return blattRechnen(v, w, v.syntax(w, ctx));
  }
  async function skalenwertAnlegen(e: SubmitEvent) {
    e.preventDefault();
    const n = (swName || swVorschlag).trim();
    swFehler = !gueltigerName(n) ? L('Der Name muss mit einem Buchstaben beginnen und darf keine Leerzeichen enthalten.', 'The name must start with a letter and must not contain spaces.')
      : s.spalten.some(x => x.name.toUpperCase() === n.toUpperCase()) ? L(`Eine Spalte „${n}“ gibt es schon.`, `A column "${n}" already exists.`) : '';
    if (swFehler) { document.getElementById('sw-name')?.focus(); return; }
    const syntax = skalenwertBefehl(skalaFragen, n, L(`${n}: Skalenwert, Mittelwert aus ${skalaFragen.join(', ')}`, `${n}: scale score, mean of ${skalaFragen.join(', ')}`), swMin);
    if (await ausfuehrenMitRueck(L(`Skalenwert ${n} angelegt`, `Scale score ${n} created`), syntax)) { swFertig = n; swName = ''; melde(L(`Neue Spalte ${n}: der Mittelwert der ${skalaFragen.length} Fragen je Person.`, `New column ${n}: the mean of the ${skalaFragen.length} questions for each person.`), true); }
  }
  /** Die Fragen dieser Prüfung als Skala merken (wie unter „Spalten“ festlegen). */
  const gemerkteSkala = $derived(erg?.typ === 'skala' && skalaFragen.length ? skalaMitFragen(skalaFragen, s.skalen) : undefined);
  let smName = $state(''), smFehler = $state('');
  async function skalaMerken(e: SubmitEvent) {
    e.preventDefault();
    const n = smName.trim(), f = skalaNameFehler(n, s.skalen);
    const belegt = skalaFragen.filter(q => s.skalen.some(sk => sk.fragen.includes(q)));
    smFehler = f === 'leer' ? d('Bitte gib der Skala einen Namen, z. B. „Organisation“.', 'Bitte geben Sie der Skala einen Namen, z. B. „Organisation“.', 'Please give the scale a name, e.g. "Organization".')
      : f === 'zeichen' ? L('Der Name darf kein „=“ enthalten und höchstens 64 Zeichen lang sein.', 'The name must not contain "=" and may be at most 64 characters long.')
      : f === 'vergeben' ? L(`Eine Skala „${n}“ gibt es schon.`, `A scale "${n}" already exists.`)
      : belegt.length ? Lp(belegt.length, `${belegt.join(', ')} gehört schon zu einer anderen Skala. Eine Frage gehört nur zu einer Skala - ändern unter „Spalten“.`, `${belegt.join(', ')} gehören schon zu einer anderen Skala. Eine Frage gehört nur zu einer Skala - ändern unter „Spalten“.`, `${belegt.join(', ')} already belongs to another scale. A question belongs to one scale only - change it under "Columns".`, `${belegt.join(', ')} already belong to another scale. A question belongs to one scale only - change it under "Columns".`) : '';
    if (smFehler) { document.getElementById('sm-name')?.focus(); return; }
    await setzeSkalen([...s.skalen, { name: n, fragen: [...skalaFragen] }]); smName = '';
    melde(L(`Skala „${n}“ gemerkt.`, `Scale "${n}" remembered.`), true);
  }
  /** Hinweis bei Verfahren, die Statable ganz selbst rechnet. */
  const eigenNotiz = (art: string, typ?: string, friedmanAn = false) => (typ === 'quantil'
    ? L('Statable rechnet dieses Verfahren mit R (quantreg; PSPP kann es nicht); Zahlen gegen R und gegen ein lineares Programm (lpSolve) geprüft (Engel-Daten). Aufruf in R unter „Für Fachleute“.', 'Statable calculates this method with R (quantreg; PSPP cannot); numbers checked against R and against a linear program (lpSolve) (Engel data). The call in R is under "For specialists".')
    : typ === 'penal'
    ? L('Statable rechnet dieses Verfahren mit R (glmnet; PSPP kann es nicht); Zahlen gegen R und gegen einen eigenen Koordinatenabstieg geprüft. Aufruf in R unter „Für Fachleute“.', 'Statable calculates this method with R (glmnet; PSPP cannot); numbers checked against R and against an own coordinate descent. The call in R is under "For specialists".')
    : typ === 'diskriminanz' || art === 'diskriminanz'
    ? L('Statable rechnet dieses Verfahren mit R (MASS::lda); die Zahlen sind gegen Formeln von Hand und gegen SPSS geprüft (iris, biopsy). Aufruf in R unter „Für Fachleute“.', 'Statable calculates this method with R (MASS::lda); the numbers are checked against formulas by hand and against SPSS (iris, biopsy). Call in R under "For specialists".')
    : typ === 'loglinear' || art === 'loglinear'
    ? L('Statable rechnet dieses Verfahren mit R (glm, Poisson); G² und df sind gegen MASS::loglm und SPSS geprüft (HairEyeColor). Aufruf in R unter „Für Fachleute“.', 'Statable calculates this method with R (glm, Poisson); G² and df are checked against MASS::loglm and SPSS (HairEyeColor). Call in R under "For specialists".')
    : typ === 'armut' || art === 'armut'
    ? L('Statable rechnet dieses Verfahren mit R (Paket survey); Median, Schwelle, Quote, S80/S20, Gini und die Standardfehler sind gegen unabhängige Rechnungen geprüft. Aufruf in R unter „Für Fachleute“.', 'Statable calculates this method with R (package survey); the median, threshold, rate, S80/S20, Gini coefficient and the standard errors are checked against independent calculations. Call in R under "For specialists".')
    : typ === 'manova' || art === 'manova'
    ? L('Statable rechnet dieses Verfahren mit R (manova); die vier Prüfgrößen sind gegen Formeln von Hand und gegen SPSS geprüft (iris). Aufruf in R unter „Für Fachleute“.', 'Statable calculates this method with R (manova); the four test statistics are checked against formulas by hand and against SPSS (iris). Call in R under "For specialists".')
    : typ === 'probit'
    ? L('Statable rechnet die Probit-Regression mit R (glm, hohe Genauigkeit); b ist gegen SPSS gleich, die Standardfehler weichen um einige Prozent ab, weil R die Fisher-Information und SPSS die Hesse-Matrix nimmt. Aufruf in R unter „Für Fachleute“.', 'Statable calculates the probit regression with R (glm, high precision); b equals SPSS, the standard errors differ by a few percent because R uses the Fisher information and SPSS the Hessian. Call in R under "For specialists".')
    : typ === 'nls'
    ? L('Statable rechnet die nichtlineare Regression mit R (nls, nur das Basispaket stats); Parameter, Standardfehler und Quadratsumme sind gegen unabhängige Rechnungen geprüft (Puromycin, ChickWeight, DNase, cars). Aufruf in R unter „Für Fachleute“.', 'Statable calculates the nonlinear regression with R (nls, base package stats only); parameters, standard errors and the sum of squares are checked against independent calculations (Puromycin, ChickWeight, DNase, cars). Call in R under "For specialists".')
    : typ === 'wls'
    ? L('Statable rechnet die gewichtete Regression mit R (lm, weights); die Zahlen sind gegen Formeln von Hand geprüft (cars). Aufruf in R unter „Für Fachleute“.', 'Statable calculates the weighted regression with R (lm, weights); the numbers are checked against formulas by hand (cars). Call in R under "For specialists".')
    : typ === 'ordreg' || typ === 'multreg' || typ === 'zaehlreg'
    ? L('Statable rechnet dieses Verfahren mit R (MASS bzw. nnet; PSPP kann es nicht); Zahlen gegen R geprüft (MASS::housing, MASS::quine). Aufruf in R unter „Für Fachleute“.', 'Statable calculates this method with R (MASS or nnet; PSPP cannot); numbers checked against R (MASS::housing, MASS::quine). The call in R is under "For specialists".')
    : typ === 'mcnemar' || typ === 'cochran'
    ? L('Statable rechnet McNemar-Test und Cochran-Q selbst (exakt); Odds Ratio mit exaktem Intervall und die Paarvergleiche kann PSPP nicht. Zahlen gegen R (exact2x2, rstatix) und gegen PSPP NPAR TESTS geprüft.', 'Statable calculates the McNemar test and Cochran\'s Q itself (exact); PSPP cannot do the odds ratio with an exact interval or the pairwise comparisons. Numbers checked against R (exact2x2, rstatix) and against PSPP NPAR TESTS.')
    : friedmanAn ? L('Statable rechnet den Friedman-Test und die Paarvergleiche selbst. Zahlen gegen R (friedman.test, coin, rstatix, wilcox.test) und gegen PSPP NPAR TESTS /FRIEDMAN geprüft.', 'Statable calculates the Friedman test and the pairwise comparisons itself. Numbers checked against R (friedman.test, coin, rstatix, wilcox.test) and against PSPP NPAR TESTS /FRIEDMAN.')
    : art === 'kaplanmeier' ? L('Statable rechnet dieses Verfahren selbst (PSPP kann es nicht); Überlebensraten, Standardfehler, Intervalle, Median und Log-Rank-Test sind gegen R (survival: survfit, survdiff) geprüft.', 'Statable calculates this method itself (PSPP cannot); survival rates, standard errors, intervals, median and log-rank test are checked against R (survival: survfit, survdiff).') : art === 'meta' ? L('Statable rechnet dieses Verfahren mit R (metafor; PSPP kann es nicht); Zahlen gegen R geprüft (dat.bcg, dat.normand1999, dat.molloy2014). Aufruf in R unter „Für Fachleute“.', 'Statable calculates this method with R (metafor; PSPP cannot); numbers checked against R (dat.bcg, dat.normand1999, dat.molloy2014). The call in R is under "For specialists".') : art === 'mehrebenen' ? L('Statable rechnet dieses Verfahren mit R (lme4, lmerTest; PSPP kann es nicht); Zahlen gegen R geprüft (sleepstudy, MathAchieve). Aufruf in R unter „Für Fachleute“.', 'Statable calculates this method with R (lme4, lmerTest; PSPP cannot); numbers checked against R (sleepstudy, MathAchieve). The call in R is under "For specialists".') : art === 'messwiederholung' ? L('Statable rechnet dieses Verfahren selbst (PSPP kann es nicht); Zahlen gegen R afex geprüft.', 'Statable calculates this method itself (PSPP cannot); numbers checked against R afex.')
    : art === 'faelle' ? L('Statable beschreibt die Fälle selbst (PSPP hat dafür kein Verfahren, und es gibt keinen Test). Mittelwert, Streuung (n − 1), Median und Häufigkeiten sind gegen R geprüft.', 'Statable describes the cases itself (PSPP has no procedure for this, and there is no test). Mean, spread (n − 1), median and frequencies are checked against R.')
    : art === 'zeitreihen' ? L('Statable rechnet Zeitreihen selbst (PSPP hat dafür nur wenige Befehle); Trend, Autokorrelation (acf), Ljung-Box, Durbin-Watson und die klassische Zerlegung (decompose) sind gegen R geprüft. Die Prognose (ARIMA, Glättung) rechnet R (stats) und ist gegen forecast::auto.arima geprüft.', 'Statable calculates time series itself (PSPP has only a few commands for it); trend, autocorrelation (acf), Ljung-Box, Durbin-Watson and the classical decomposition (decompose) are checked against R. The forecast (ARIMA, smoothing) is calculated by R (stats) and checked against forecast::auto.arima.')
    : art === 'cluster' ? L('Ward (hclust ward.D2) und k-Means (Hartigan-Wong, 25 Starts) rechnet R mit dem Basispaket stats; Silhouette, Profile und η² rechnet Statable selbst, geprüft gegen R (cluster::silhouette). PSPP Quick Cluster hat keine Zufallsstarts und kann bei k-Means ein schlechteres Ergebnis (lokales Optimum) liefern.', 'Ward (hclust ward.D2) and k-means (Hartigan-Wong, 25 starts) are calculated by R with the base package stats; silhouette, profiles and η² are calculated by Statable itself, checked against R (cluster::silhouette). PSPP Quick Cluster has no random starts and can give a worse result (local optimum) with k-means.')
    : art === 'einzelfall' ? L('Statable rechnet dieses Verfahren selbst (PSPP kann es nicht); NAP, PND, Tau-U und baseline-korrigiertes Tau sind gegen R (scan, SingleCaseES) geprüft.', 'Statable calculates this method itself (PSPP cannot); NAP, PND, Tau-U and baseline-corrected Tau are checked against R (scan, SingleCaseES).') : '');
  const hauptTabellen = $derived(blatt ? blatt.items.filter(i => i.type === 'table' && !/Case Processing|Reading|Variables Entered|Summary$/.test(i.label)) : []);
  /* ---------- Diagramm anpassen ---------- */
  let dgOffen = $state(false);
  $effect(() => { if (blatt && erg?.typ === 'zwei-gruppen' && !blatt.dg) blatt.dg = dgGrund(blatt.titel, name(erg.e.abhaengig)); });
  const dg = $derived(blatt?.dg ?? (erg?.typ === 'zwei-gruppen' ? dgGrund(blatt!.titel, name(erg.e.abhaengig)) : undefined) as DgOptionen | undefined);
  /** Ein Blatt, dessen Daten sich geändert haben und das gerade neu rechnet, wird vor dem Export fertig gerechnet (höchstens 10 s); sonst steht „veraltet“ im Export (Abnahme 4, B1). */
  async function frischWarten() { for (let i = 0; i < 100 && veraltet && (rechner.anstehend || wartet); i++) await new Promise(r => setTimeout(r, 100)); }
  /** B1: Alles, was das R-Skript zum Blatt braucht (Spalten, Daten, Titel); `null` ohne Blatt. Mit Häufigkeitsgewicht erweitert das Skript die Zeilen (Teil 2f), mit Umfragegewicht gibt es kein Skript. Einen eingeschalteten Filter gibt es nicht: „Fälle auswählen“ legt eine Spalte an oder entfernt Zeilen - die Daten sind also schon die ausgewählten. */
  const rSkriptKontext = $derived.by((): RKontext | null => {
    if (!blatt || id === 'neu' || veraltet) return null;
    const w = werteVon(blatt);
    return { spalten: s.spalten, zeilen: s.zeilen, blattSpalten: [...w.l1, ...w.l2, ...w.l3, ...w.l4], titel: blatt.titel, datum: heute(), ...rGewichtFelder(blatt.gewicht, aktivesGewicht()) };   // Teil 2f: Häufigkeitsgewicht wird nachgebaut
  });
  /** Skript und Daten als ZIP: gerechnet wird nichts, das Skript läuft nur auf dem eigenen Rechner. */
  function exportiereRSkript() {
    if (!rSkriptKontext || !erg) return;
    try {
      const res = baueRSkript(erg as RErgebnis, rSkriptKontext);
      herunterladen(rSkriptZip(res), `${res.rName.replace(/.R$/, '')}.zip`, 'application/zip');
      melde(L(`R-Skript mit Daten gespeichert (${res.rName} und ${res.csvName}). Es liegt bei den Downloads.`, `R script with data saved (${res.rName} and ${res.csvName}). You will find it in your downloads.`));
    } catch { meldeFehler(L('Zu diesem Ergebnis gibt es kein R-Skript.', 'There is no R script for this result.')); }
  }
  /** Das ganze Blatt: Word und PDF wie im Bericht (nur dieses Blatt), Excel mit den Tabellen. */
  const blattExport = $derived<ExportEintrag[]>(!blatt ? [] : [
    { id: 'word', text: L('Als Word-Datei', 'As Word file'), tun: async () => { await frischWarten(); await exportiereBerichtWord([blatt], [], blatt.titel, `${blatt.titel} - ${L('Ergebnisse', 'Results')}`); } },
    { id: 'pdf-bf', text: L('Als PDF (über Drucken)', 'As PDF (via Print)'), tun: async () => { await frischWarten(); const { druckeBerichtBarrierefrei } = await import('../lib/druckansicht'); await druckeBerichtBarrierefrei([blatt], [], blatt.titel, n => lesbar(s.spalten.find(x => x.name === n), true)); } },
    { id: 'excel', text: L('Als Excel-Datei', 'As Excel file'), tun: async () => { await frischWarten(); await exportiereErgebnisseExcel([{ titel: blatt.titel, text: saetze ? `${saetze.haupt} ${saetze.zusatz.replace(/\n/g, ' ')}` : undefined, items: excelTabellen(blatt), veraltet: veraltetMarke(blatt) || undefined }], blatt.titel, rechenText([blatt])); } },
    ...(rSkriptKontext && rSkriptMoeglich(erg as RErgebnis | null, rSkriptKontext) ? [{ id: 'r-skript', gruppe: L('Zum Nachrechnen', 'To recalculate'), text: L('Als R-Skript mit Daten (.zip)', 'As R script with data (.zip)'), tun: async () => { await frischWarten(); exportiereRSkript(); } }] : [])
  ]);
  const dgTitel = $derived(dg?.titel || blatt?.titel || '');
  async function kopiereApa(t: string) { await kopiereKursiv(t, richtung() === 'rtl'); melde(L('Kopiert: ', 'Copied: ') + t); }
  async function kopiere(t: string) { try { await navigator.clipboard.writeText(t); } catch { /* egal */ } melde(L('Kopiert: ', 'Copied: ') + t); }
  /** Wie das x im Reiter: erst die Rückfrage (bausteine/ReiterSchliessen.svelte), gelöscht wird erst nach „Ja“. */
  function loeschen() { if (!blatt) return; schliessen.offen = { id: blatt.id, titel: blatt.titel }; }
  /* ---------- Sofort rechnen (wie jamovi und JASP) ---------- */
  /** Das Blatt, dessen Frage gerade im Editor steht (neu angelegt oder geöffnet); null = noch keins. */
  let liveId = $state<string | null>(null);
  /** Schlüssel der Rechnung, zu der das angezeigte Ergebnis gehört (Spalten + Optionen + Datenstand); leer = nichts gerechnet. */
  let gerechnetKey = $state('');
  /** Ruhig: erst abblenden, dann (nach ca. 0,5 s) der Hinweis; beides verschwindet mit dem fertigen Ergebnis. */
  let wartet = $state(false), gedimmt = $state(false), hinweisAn = $state(false);
  let dimTimer: ReturnType<typeof setTimeout> | undefined, hinweisTimer: ReturnType<typeof setTimeout> | undefined;
  function wartetSetzen(an: boolean) {
    clearTimeout(dimTimer); clearTimeout(hinweisTimer);
    wartet = an;
    if (an) { dimTimer = setTimeout(() => (gedimmt = true), ABBLENDEN_NACH_MS); hinweisTimer = setTimeout(() => (hinweisAn = true), HINWEIS_NACH_MS); }
    else { gedimmt = false; hinweisAn = false; }
  }
  /** Die Spalten, die ein Blatt wirklich benutzt, und der Stand ihrer Daten (lib/blattstand.ts - dieselbe Prüfung wie im Bericht). */
  const standFuer = (w: Werte) => standVon(w, s);
  /** Rechnungen, die nicht aus PSPP kommen (kein Befehl nötig). */
  const OHNE_BEFEHL = ['messwiederholung', 'einzelfall', 'kaplanmeier', 'faelle', 'mehrebenen', 'meta', 'kategorien', 'zeitreihen', 'cluster', 'diskriminanz', 'loglinear', 'manova', 'armut'];
  const sperreDa = $derived(pruefliste.some(p => p.art === 'sperre'));
  /** Alles, wovon das Ergebnis abhängt, als ein Schlüssel. Ändert er sich, ist das angezeigte Ergebnis überholt. */
  const editorKey = $derived.by(() => {
    if (!verfahren || !fertigGewaehlt) return null;
    return JSON.stringify([verfahren.id, werte, uebWunsch, kmWahl, mfMitNull, syntax, verfahren.id === 'meta' ? metaPrueflisteWert.eingabe : standFuer(werte), zusatzAn(zusEff) ? zusEff : null, verfahren.id === 'faktor' ? faWahl.grenze : null]);   // Faktorenanalyse: „Kleine Ladungen ausblenden“ ändert den Befehl nicht, aber die Tabelle (Nachttest 24.10.)
  });
  /** Rechnet das offene Blatt von selbst? (an, und R-Verfahren nur mit geladenem R) */
  const vonSelbst = $derived(!!verfahren && rechnetVonSelbst({ sofort: s.einst.sofort || nurRechnen, verfahrenId: verfahren.id, rBereit: rStatus.bereit || (nurRechnen && mitR), mitR: katArt !== null || kursArt !== null || kpKarte !== null || coxAn || clusterAn || umfrageAn || designBAn }));
  /** Die Daten haben sich seit der Rechnung geändert (Blatt geöffnet, Daten-Seite dazwischen). */
  /** Spalten, die dieses Blatt braucht und die entfernt wurden (D12): keine alten Zahlen als gültig zeigen, nicht rechnen, nicht in den Bericht. */
  const fehlt = $derived(blatt && id !== 'neu' ? fehlendeSpalten(blatt, s) : []);
  const veraltet = $derived(!!blatt && id !== 'neu' && !!blatt.stand && blatt.art !== 'meta' && blatt.art !== 'kategorien' && standFuer(werteVon(blatt)) !== blatt.stand);
  const geaendert = $derived(editorKey !== null && editorKey !== gerechnetKey);
  /** Sofort rechnen aus (oder R noch nicht geladen) und die Auswahl hat sich geändert: Das Ergebnis darunter ist von der alten Auswahl und wird als solches gezeigt (Abnahme 4, B11). */
  const ueberholt = $derived(geaendert && !vonSelbst && id !== 'neu');
  /** Rechnet diese Frage in der jetzigen Wahl über R? (Karte, die nur über R rechnet, oder eine R-Option ist gewählt.) */
  const rKnopf = $derived(!!verfahren && (verfahren?.id === 'mehrebenen' || verfahren?.id === 'meta' || katArt !== null || vorhArt !== null || kursArt !== null || kpKarte !== null || coxAn || clusterAn || umfrageAn || designBAn));
  /** Welche R-Pakete die Frage in der jetzigen Wahl braucht. */
  const rPakete = $derived(kpKarte === 'armut' ? R_PAKETE_ARMUT : clusterAn || kursArt !== null || kpKarte === 'loglinear' || kpKarte === 'manova' ? [] : kpKarte === 'diskriminanz' ? R_PAKETE_DISKR : umfrageAn || designBAn ? R_PAKETE_UMFRAGE : coxAn ? R_PAKETE_COX : verfahren?.id === 'meta' ? R_PAKETE_META : vorhArt === 'quantil' ? R_PAKETE_QUANTIL : vorhArt === 'penal' ? R_PAKETE_STRAF : katArt === 'ordreg' ? R_PAKETE_ORD : katArt === 'multreg' ? R_PAKETE_MULT : katArt === 'zaehlreg' ? R_PAKETE_ZAEHL : R_PAKETE_MEB);
  /** R laden, sobald klar ist, dass es gebraucht wird (Vorgabe Johannes 31.10.), nie auf Verdacht: nur bei einer R-Wahl (auch wenn die Eingabe noch unvollständig ist: die Wahl steht fest), und bei einem schon gespeicherten Blatt erst,
   *  wenn die Wahl geändert wurde (ein unverändertes Blatt zeigt sein gespeichertes Ergebnis, dafür braucht es R nicht). Verlässt man die Frage, stoppt das Laden. */
  const rVorSchluessel = $derived(rKnopf && (id === 'neu' || geaendert) ? rPakete.join(',') : null);
  $effect(() => {
    const k = rVorSchluessel;
    if (k === null) return;
    return rHalten(k ? k.split(',') : []);
  });

  const editorDa = $derived(!!blatt && id !== 'neu' && !!vf && vf.id !== 'meta' && liveId === blatt.id && !!verfahren);
  /** Gesperrte Frage (jedes Verfahren: leere Zelle, leerer Block, Grenze Δ fehlt, zu wenige Personen …): Das frühere Ergebnis ist nicht mehr gültig
   *  und verschwindet (samt APA-Zeile, Tabellen und Bericht); an seiner Stelle steht die Meldung (Fachprüfung Paket A, Punkt 1; Pakete B und C, Punkt 1). Rechnet die Frage wieder, kommt ein neues Ergebnis (`ersetze` setzt `gesperrt` zurück).
   *  Nur bei echter Sperre der jetzigen Auswahl, nie vorübergehend beim Laden oder Öffnen: siehe `ergebnisFaelltWeg` (Daten laden, Spalte fehlt, Auswahl und Daten unverändert). */
  $effect(() => {
    const b = blatt, z = { gesperrt: b?.gesperrt, editorDa, sperre: sperreDa, fehlt: fehlt.length, datenLaedt: s.datenLaedt, geaendert, veraltet };
    untrack(() => {
      if (!b || id === 'neu' || !ergebnisFaelltWeg(z)) return;
      rechner.verwerfe(); wartetSetzen(false); gerechnetKey = '';
      b.ergebnis = null; b.items = []; b.gesperrt = true; void sichern();
    });
  });
  /** Meldung von R bei ordinaler, multinomialer oder Zähldaten-Regression: das offene Blatt verliert sein altes Ergebnis und zeigt sie im Ergebnisbereich (wie bei einer Sperre). */
  let katFehler = '';
  let schnapp: { verfahren: Verfahren; werte: Werte; syntax: string; zus: ZusatzWahl } | null = null;
  const rechner = liveRechner<{ b: Blatt | null; ziel: string | null }>({
    rechne: async (key, gilt) => {
      const sn = schnapp!, ziel = liveId;
      gerechnetKey = key;
      return { b: await berechneBlatt(sn.verfahren, sn.werte, sn.syntax, gilt, sn.zus), ziel };
    },
    zeige: ({ b, ziel }) => {
      if (!b) {
        const bl = ziel ? s.blaetter.find(x => x.id === ziel) : undefined;
        if (bl && katFehler) { bl.ergebnis = null; bl.items = []; bl.gesperrt = true; bl.fehler = katFehler; void sichern(); void tick().then(() => document.getElementById('gesperrt-meldung')?.focus()); }
        ende?.(false); return;
      }
      if (ziel && ziel === liveId && s.blaetter.some(x => x.id === ziel)) { ersetze(b, ziel); ende?.(true); }
      else if (!ziel) anlegen(b);
      else ende?.(false);
    },
    beschaeftigt: wartetSetzen,
    fehler: f => { if (import.meta.env.DEV) console.warn('Sofort rechnen:', f); mebFehler = (f as Error)?.message ?? ''; ende?.(false); }
  });
  onDestroy(() => { rechner.verwerfe(); clearTimeout(dimTimer); clearTimeout(hinweisTimer); });
  /** Das Ergebnis eines offenen Blatts austauschen - erst, wenn das neue ganz fertig ist. Notiz, Berichtswahl und Diagramm-Einstellungen bleiben. */
  let ergebnisOrt = $state<HTMLElement>();
  /** Umschalten ohne Neurechnen (Mittelwerte ↔ Rangtest liegt schon vor): auch dann gleitet das Ergebnis herein (Johannes 10.10.). */
  let rangVorher: boolean | undefined | null = null;
  $effect(() => { const r = blatt?.rang; untrack(() => { if (rangVorher !== null && r !== rangVorher) void tick().then(() => hereingleiten(ergebnisOrt)); rangVorher = r; }); });
  function ersetze(neu: Blatt, ziel: string) {
    const alt = s.blaetter.find(x => x.id === ziel); if (!alt) return;
    let titel = neu.titel;
    try { const v = VERFAHREN.find(x => x.id === alt.art); if (v && alt.titel !== v.titelBlatt(werteVon(alt), spalteNach, { fa: faAusErgebnis(alt.ergebnis), prozess: alt.zus?.prozess?.modell })) titel = alt.titel; } catch { /* neuer Titel */ }
    // Die an einer Tabelle gewählte Ansicht (Farben) bleibt beim Neurechnen - zugeordnet über die Art der Tabelle (label).
    const ansichten = new Map(alt.items.flatMap(i => (i.type === 'table' && i.ansicht ? [[i.label, i.ansicht] as const] : [])));
    for (const i of neu.items) if (i.type === 'table' && ansichten.has(i.label)) i.ansicht = ansichten.get(i.label);
    Object.assign(alt, { titel, art: neu.art, l1: neu.l1, l2: neu.l2, l3: neu.l3, syntax: neu.syntax, items: neu.items, ergebnis: neu.ergebnis, zus: neu.zus, gewicht: neu.gewicht, gesperrt: undefined, fehler: undefined, stand: neu.stand, zeit: neu.zeit });
    rangArtErneuern(alt);
    sichern();
    mebFehler = '';
    void tick().then(() => hereingleiten(ergebnisOrt));   // das neue Ergebnis gleitet herein statt zu springen (10.10.)
    // Hat die Rechnung schon „Ergebnis fertig …“ gesagt (lange Rechnung), kommt nichts mehr dazu; sonst genau eine kurze Ansage über die feste Region.
    if (!endeJuengstAngesagt()) sage(L('Ergebnis aktualisiert.', 'Result updated.'));
  }
  /** Die Frage eines geöffneten Blatts in den Editor laden (Spalten und Optionen ändern). */
  function ladeEditor(b: Blatt) {
    rechner.verwerfe(); wartetSetzen(false);
    const v = VERFAHREN.find(x => x.id === b.art);
    if (!v || v.id === 'meta' || v.id === 'kategorien') { liveId = null; verfahren = null; gerechnetKey = ''; if (nurRechnen) ende?.(v?.id === 'kategorien'); return; }
    const w = werteVon(b), e = b.ergebnis as { typ?: string; e?: { ereignisIndex?: 0 | 1; mitNull?: boolean } } | null;
    verfahren = v; zus = kopiereZusatz(b.zus); werte = { l1: [...w.l1], l2: [...w.l2], l3: [...w.l3], l4: [...w.l4] }; offen = null; mebFehler = '';
    uebersprungen = v.luecken.filter(l => l.mindestens === 0 && !w[l.schluessel].length).map(l => l.schluessel);
    uebWunsch = b.art === 'uebereinstimmung' ? (e?.typ === 'kappa' || e?.typ === 'inter' ? 'kappa' : e?.typ === 'icc' ? 'icc' : null) : null;
    faWahl = faAusErgebnis(b.ergebnis) ?? { methode: 'pc', zahl: null, grenze: 0.3 };
    kmWahl = b.art === 'kaplanmeier' ? e?.e?.ereignisIndex ?? null : null;
    logUmkehr = b.art === 'vorhersage' && e?.typ === 'logistik' && !!(e.e as { umgekehrt?: boolean } | undefined)?.umgekehrt;
    jaUmkehr = (e?.typ === 'mcnemar' || e?.typ === 'cochran') && !!(e.e as { ja?: { umgekehrt?: boolean } } | undefined)?.ja?.umgekehrt;
    mfMitNull = !!e?.e?.mitNull;
    liveId = b.id;
    if (!b.stand) b.stand = standFuer(w);
    // Das angezeigte Ergebnis gehört zu diesem Schlüssel - außer die Daten haben sich geändert: dann ist es überholt und wird neu gerechnet.
    const k = editorKey;
    gerechnetKey = veraltet || b.gesperrt ? '' : k ?? '';
    rechner.uebernimm(veraltet || b.gesperrt ? null : k);
    if (nurRechnen && !veraltet && !b.gesperrt) ende?.(true);
  }
  $effect(() => { const b = blatt; if (id === 'neu' || !b) return; untrack(() => { if (liveId !== b.id) ladeEditor(b); }); });
  /** Jede Änderung von Spalten, Optionen oder Daten: entprellt neu rechnen (wenn erlaubt). */
  $effect(() => {
    const key = editorKey, sperre = sperreDa || fehlt.length > 0, auto = vonSelbst, v = verfahren;
    untrack(() => {
      if (!v || key === null) return;
      if (rechnet) { rechner.verwerfe(); return; }   // der Knopf rechnet gerade (z. B. R wird geladen): nicht doppelt
      if (!auto || sperre || (!OHNE_BEFEHL.includes(v.id) && !syntax) || (v.id === 'meta' && !metaPrueflisteWert.eingabe) || (v.id === 'kategorien' && id !== 'neu')) { rechner.verwerfe(); if (nurRechnen) ende?.(false); return; }
      if (id !== 'neu' && blatt && liveId !== blatt.id) return;   // der Editor gehört noch zum vorigen Blatt
      schnapp = { verfahren: v, werte: $state.snapshot(werte) as Werte, syntax, zus: $state.snapshot(zusEff) as ZusatzWahl };
      rechner.wunsch(key);
    });
  });
  /** Knopf „Neu rechnen“ (Sofort rechnen aus, oder R noch nicht geladen). */
  function neuRechnen() {
    if (!verfahren || editorKey === null) return;
    if (sperreDa) { const ziel = document.querySelector<HTMLElement>('[data-klaeren]') ?? document.getElementById('pruef-sperre'); if (ziel) { ziel.tabIndex = -1; ziel.focus(); } return; }
    schnapp = { verfahren, werte: $state.snapshot(werte) as Werte, syntax, zus: $state.snapshot(zusEff) as ZusatzWahl };
    rechner.jetzt(editorKey);
  }
  /** Usability 4c: Props für die Empfehlung „Rangtest“ oben im Ergebnis - dieselben Bedingungen wie die BlattRang-Aufrufe unten (Messwiederholung: keine Empfehlung). */
  const rangEmpfehlung = $derived.by(() => {
    if (!erg || !blatt) return null;
    if (erg.typ === 'ohne-streuung' && erg.art === 'prae-post' && erg.rang && blatt.l1 && blatt.l2) return { paired: true as const, rang: erg.rang as RangErgebnis | null, vorschlag: rangVorschlagFuer('prae-post', blatt.l1, blatt.l2), sperre: null as string | null };
    if (erg.typ === 'zwei-gruppen' || erg.typ === 'anova' || erg.typ === 'prae-post') return { paired: erg.typ === 'prae-post', rang: (erg.rang ?? null) as RangErgebnis | null, vorschlag: erg.typ === 'prae-post' ? rangVorschlagFuer('prae-post', erg.e.vorher, erg.e.nachher) : rangVorschlagFuer('gruppen', erg.e.abhaengig, erg.e.gruppenSpalte), sperre: erg.typ === 'prae-post' ? gwSatz('praepost:vorzeichen') ?? gwSatz('praepost:wilcoxon') : gwSatz('gruppen:rang-weitere') ?? gwSatz('gruppen:rang') };
    return null;
  });
  /** Was der Rand von selbst erklärt: die Karte, auf die gezeigt wird; beim Wählen das Verfahren und was in die Lücke gehört; bei der Prüfung die Voraussetzungen; beim Ergebnis das Lesen. */
  const randKontext = $derived.by((): RandKontext | null => {
    if (id === 'neu') {
      if (!verfahren) {
        const v = kartenBlick ? VERFAHREN.find(x => x.id === kartenBlick) : undefined;
        return v ? { titel: v.titel, zeile: v.zusatz, artikel: `frage-${v.id}`, teile: ['kurz'], mehrTeile: ['beispiele'] }
          : { titel: L('Welche Karte passt?', 'Which card fits?'), text: d('Zeig mit der Maus auf eine Karte oder geh mit der Tab-Taste hin. Hier steht dann, wofür das Verfahren da ist, mit Beispielen aus der Bildungswissenschaft. Die Wahl lässt sich jederzeit ändern.', 'Zeigen Sie mit der Maus auf eine Karte oder gehen Sie mit der Tab-Taste hin. Hier steht dann, wofür das Verfahren da ist, mit Beispielen aus der Bildungswissenschaft. Die Wahl lässt sich jederzeit ändern.', 'Point at a card with the mouse or move to it with the Tab key. This shows what the method is for, with examples from educational research. You can change the choice at any time.') };
      }
      const art = jaNeinFall(verfahren, werte) ? 'mcnemar-test-cochran-q' : verfahren.id === 'gruppen' && werte.l3.length ? 'zweifaktorielle-varianzanalyse' : verfahren.id === 'gruppen' && werte.l4.length ? 'kovarianzanalyse' : verfahren.id === 'vorhersage' && katArt ? katHilfeId(katArt)! : verfahren.id === 'vorhersage' && zusEff.hier.an ? 'hierarchische-regression' : `frage-${verfahren.id}`;
      if (!fertigGewaehlt) return { titel: `${verfahren.titel} (${verfahren.zusatz})`, zeile: luecke ? `${L('Jetzt', 'Now')}: ${luecke.frage}` : undefined, artikel: art, teile: ['kurz', 'tabelle', 'voraus'] };
      return { titel: L('Was Statable prüft', 'What Statable checks'), zeile: `${verfahren.titel} (${verfahren.zusatz})`, artikel: art, teile: ['voraus', 'beispiele'] };
    }
    return vf ? { titel: L('Ergebnis lesen', 'Reading the result'), zeile: `${vf.titel} (${vf.zusatz})`, artikel: erg?.typ === 'mcnemar' || erg?.typ === 'cochran' ? 'mcnemar-test-cochran-q' : rangBlatt?.art === 'friedman' ? 'friedman-test' : erg?.typ === 'anova2' ? 'zweifaktorielle-varianzanalyse' : erg?.typ === 'ancova' ? 'kovarianzanalyse' : erg?.typ === 'hierreg' ? 'hierarchische-regression' : katHilfeId(erg?.typ) ?? `frage-${vf.id}`, teile: erg?.typ === 'logistik' ? ['logistisch'] : ['lesen'], apa: saetze?.apa && !fehlt.length && !blatt?.gesperrt ? saetze.apa : undefined } : null;   // logistisch: der Abschnitt zur logistischen Regression, nicht „Linear: Ergebnis lesen“ (Nachttest 24.10.)
  });
  /** „Warum dieses Verfahren?“ bei Blöcken (G4). */
  const hierWarum = () => L('Die Spalten sind in Blöcke geordnet. Statable rechnet je Block ein Modell mit allen Spalten bis zu diesem Block und prüft, ob der Block die erklärte Varianz über die vorigen Blöcke hinaus erhöht (ΔR², F-Änderung wie SPSS „F Change“). Alle Blöcke rechnen auf denselben Fällen. Die Reihenfolge der Blöcke ist vor der Auswertung theoretisch zu begründen; ΔR² ist kein Beleg für eine Ursache.', 'The columns are arranged in blocks. Statable calculates one model per block with all columns up to that block and tests whether the block raises the explained variance beyond the previous blocks (ΔR², F change as in SPSS "F Change"). All blocks are calculated on the same cases. The order of the blocks is to be justified by theory before the analysis; ΔR² is no evidence of a cause.');
  const extra = $derived({ 'test-warum': { titel: L('Warum dieses Verfahren?', 'Why this method?'), kurz: (rangBlatt ? rangMitteText(rangBlatt.art === 'friedman' ? 'mw' : rangBlatt.art === 'wilcoxon') + ' ' : '') + (verfahren && fertigGewaehlt ? (verfahren.id === 'vorhersage' && vorhArt ? (vorhArt === 'quantil' ? quantilWarum() : strafWarum()) : verfahren.id === 'vorhersage' && kursArt ? (kursArt === 'probit' ? probitWarum() : kursArt === 'nls' ? nlsWarum() : wlsWarum()) : verfahren.id === 'vorhersage' && katArt ? katWarum(katArt) : verfahren.warum(werte, ctx)) + (verfahren.id === 'vorhersage' && zusEff.hier.an ? ' ' + hierWarum() : '') : erg?.typ === 'hierreg' ? hierWarum() : erg?.typ === 'quantil' ? quantilWarum() : erg?.typ === 'penal' ? strafWarum() : erg?.typ === 'ordreg' || erg?.typ === 'multreg' || erg?.typ === 'zaehlreg' ? katWarum(erg.typ) : erg?.typ === 'zusammenhang' ? korrWarum(erg.e.methode ?? 'pearson') : erg?.typ === 'kappa' ? uebereinstimmungWarum('kappa') : erg?.typ === 'inter' ? uebereinstimmungWarum('inter') : erg?.typ === 'icc' ? uebereinstimmungWarum('icc') : erg?.typ === 'messwiederholung' || erg?.typ === 'anova2' || erg?.typ === 'ancova' || erg?.typ === 'mediation' || erg?.typ === 'moderation' || erg?.typ === 'einzelfall' || erg?.typ === 'kaplanmeier' || erg?.typ === 'faelle' || erg?.typ === 'mehrebenen' || erg?.typ === 'meta' ? (vf?.warum(gewaehlt, ctx) ?? '') : (vf?.warum({ l1: blatt?.l3 ?? [], l2: blatt?.l2 ? [blatt.l2] : [], l3: [], l4: [] }, ctx) ?? '')), beispiel: L('Statable schlägt das Verfahren vor; im Befehl steht genau, was gerechnet wird.', 'Statable suggests the method; the command shows exactly what is calculated.'), vorsicht: L('Die Auswahl der Verfahren ist noch von einer Statistik-Fachperson abzunehmen.', 'The choice of methods still needs to be checked by a statistics expert.') },
    // Später S-F2: eigene Erklärungen der neuen Marken (die Begriffsliste A-Z bleibt bis zur Übersetzung unverändert)
    'aft-modell': { titel: L('AFT-Modell (Zeitverhältnis)', 'AFT model (time ratio)'), kurz: L('Das AFT-Modell sagt, um welchen Faktor sich die Zeit bis zum Ereignis ändert. Das Zeitverhältnis ist exp(b): 1,5 heißt eineinhalbmal so lange, 0,5 halb so lange. Es ist kein Hazard.', 'The AFT model says by which factor the time to the event changes. The time ratio is exp(b): 1.5 means one and a half times as long, 0.5 half as long. It is not a hazard.'), beispiel: L('Frauen: Zeitverhältnis 1,49, 95 %-KI [1,17; 1,90]: Die Überlebenszeit ist rund 1,5-mal so lang wie bei Männern.', 'Women: time ratio 1.49, 95% CI [1.17, 1.90]: the survival time is about 1.5 times as long as for men.'), vorsicht: L('Das Vorzeichen von b ist hier entgegengesetzt zur Cox-Regression: positiv heißt längere Zeit. Die Verteilung (Weibull u. a.) ändert die Zahlen; der AIC ist kein Test.', 'The sign of b is opposite to the Cox regression here: positive means a longer time. The distribution (Weibull etc.) changes the numbers; the AIC is not a test.') },
    'frailty': { titel: L('Cluster und Frailty', 'Cluster and frailty'), kurz: L('Gehören mehrere Zeilen zur selben Person oder Gruppe, sind sie nicht unabhängig. Mit Cluster bleiben die Hazard Ratios und nur die Standardfehler ändern sich. Die Frailty gibt jeder Gruppe eine eigene Neigung und schätzt deren Varianz.', 'If several rows belong to the same person or group, they are not independent. With cluster the hazard ratios stay and only the standard errors change. The frailty gives each group a tendency of its own and estimates its variance.'), beispiel: L('Würfe von Ratten: HR 2,04 ohne Kennung, mit Cluster gleiche HR, aber breiteres Intervall; mit Frailty bedingte HR 2,07.', 'Litters of rats: HR 2.04 without identifier, with cluster the same HR but a wider interval; with frailty a conditional HR of 2.07.'), vorsicht: L('Bedingte (Frailty) und marginale (Cluster) Hazard Ratio sind verschiedene Zahlen. Unter 20 Gruppen sind Standardfehler und Varianz unsicher.', 'The conditional (frailty) and marginal (cluster) hazard ratio are different numbers. With fewer than 20 groups, standard errors and variance are uncertain.') } });
</script>

{#snippet lueckeKnopf(l: Luecke)}<button type="button" class="luecke" class:leer={!werte[l.schluessel].length} data-tipp={werte[l.schluessel].length ? L('Klicken, um die Auswahl zu ändern', 'Click to change the choice') : L('Klicken, um eine Spalte zu wählen', 'Click to choose a column')} aria-expanded={offen === l.schluessel} aria-controls="wahl" onclick={() => { offen = offen === l.schluessel ? null : l.schluessel; tick().then(() => document.querySelector<HTMLElement>('#wahl input')?.focus()); }}>{werte[l.schluessel].length > 4 ? Lp(werte[l.schluessel].length, `${werte[l.schluessel].length} Spalte`, `${werte[l.schluessel].length} Spalten`, `${werte[l.schluessel].length} column`, `${werte[l.schluessel].length} columns`) : werte[l.schluessel].length ? werte[l.schluessel].map(n => l.satz(spalteNach(n)!)).join(', ') : l.mindestens === 0 && offen !== l.schluessel && werte.l1.length >= (verfahren!.luecken[0]!.mindestens ?? 1) ? L('keine', 'none') : '…'}<span class="nur-vorleser">{werte[l.schluessel].length ? L(' (ändern)', ' (change)') : L(` (auswählen: ${l.frage})`, ` (choose: ${l.frage})`)}</span></button>{/snippet}
{#snippet modellWege()}
{#if zielSpalte && modellPassend.length}
  <div class="zusatz-wahl" style="margin-top:var(--a3)">
    <fieldset class="zusatz-gruppe"><legend>{L('Modell', 'Model')}</legend>
      {#if modellPassend.length > 1}
        <div class="segment" role="radiogroup" aria-describedby="modell-h">{#each modellPassend as m (m)}<label><input type="radio" name="modell-art" value={m} checked={modellArtEff === m} onchange={() => modellSetzen(m)}>{modellName(m)}</label>{/each}</div>
      {/if}
      <p id="modell-h" class="hilfe">{modellArtEff === 'multi' ? (modellPassend.length === 1 ? L('Das Ziel besteht aus Kategorien ohne Ordnung: Statable rechnet eine multinomiale logistische Regression.', 'The target consists of categories without an order: Statable calculates a multinomial logistic regression.') : L('Multinomial nimmt keine Ordnung der Stufen an und schätzt für jede Kategorie eigene Koeffizienten; das braucht mehr Fälle.', 'Multinomial assumes no order of the levels and estimates separate coefficients for each category; that needs more cases.'))
        : modellArtEff === 'ordinal' ? L('Ordinal nutzt die Reihenfolge der Stufen und nimmt für jede Vorhersagegröße eine gemeinsame Wirkung an allen Trennstellen an (Brant-Test).', 'Ordinal uses the order of the levels and assumes one common effect of each predictor at all cut points (Brant test).')
        : modellArtEff === 'zaehl' ? L('Zähldaten: ganze Zahlen ab 0. Statable prüft, ob Poisson reicht oder die Werte stärker streuen, und rechnet dann negativ-binomial.', 'Count data: whole numbers from 0. Statable checks whether Poisson is enough or the values vary more, and then calculates negative binomial.')
        : modellArtEff === 'quantil' ? L('Die Quantilregression sagt nicht den Mittelwert voraus, sondern den Median oder ein anderes Quantil. Sie ist robust gegen Ausreißer im Ziel und zeigt, ob der Zusammenhang am Rand der Verteilung anders verläuft als in der Mitte.', 'Quantile regression does not predict the mean but the median or another quantile. It is robust against outliers in the target and shows whether the relationship runs differently at the edge of the distribution than in the middle.')
        : modellArtEff === 'penal' ? L('Ridge, Lasso und Elastic Net eignen sich für viele Vorhersagegrößen: Eine Strafe zieht die Koeffizienten zur Null, die Stärke wählt eine Kreuzvalidierung. Das dient der Vorhersage; nach der Auswahl gibt es keine p-Werte.', 'Ridge, lasso and elastic net suit many predictors: a penalty pulls the coefficients towards zero, a cross-validation chooses the strength. This serves prediction; after the selection there are no p values.')
        : modellArtEff === 'probit' ? L('Probit schätzt die Wahrscheinlichkeit des Ereignisses mit der Normalverteilung als Verknüpfung; b steht auf deren Skala, ein Odds Ratio gibt es nicht. Logit und Probit geben fast immer dieselbe Aussage.', 'Probit estimates the probability of the event with the normal distribution as the link; b is on its scale, there is no odds ratio. Logit and probit almost always give the same message.')
        : modellArtEff === 'nls' ? L('Die nichtlineare Regression passt eine von vier festen Formeln an (Michaelis-Menten, exponentiell, logistisch, Potenz). Die Formel muss sachlich begründet sein; eine freie Formel gibt es nicht.', 'Nonlinear regression fits one of four fixed formulas (Michaelis-Menten, exponential, logistic, power). The formula must be justified by subject matter; there is no free formula.')
        : modellArtEff === 'wls' ? L('Die gewichtete Regression gibt genauen Werten mehr Gewicht. Die Gewichte müssen aus Wissen über die Messgenauigkeit kommen, nicht aus den Residuen derselben Daten.', 'The weighted regression gives exact values more weight. The weights must come from knowledge about the measurement precision, not from the residuals of the same data.')
        : zielBinaer ? L('Das Ziel hat zwei Werte: Logit (logistische Regression) ist der Standard. Probit nimmt statt der logistischen die Normalverteilung als Verknüpfung.', 'The target has two values: logit (logistic regression) is the default. Probit uses the normal distribution as the link instead of the logistic one.')
        : !modellPassend.some(m => m === 'ordinal' || m === 'multi' || m === 'zaehl') ? L('Die lineare Regression sagt den Mittelwert voraus. Die Quantilregression sagt den Median oder andere Quantile voraus; Ridge, Lasso und Elastic Net sind für viele Vorhersagegrößen gedacht. Gerechnet wird, was hier gewählt ist.', 'Linear regression predicts the mean. Quantile regression predicts the median or other quantiles; ridge, lasso and elastic net are meant for many predictors. What is chosen here is calculated.')
        : L('Das Ziel hat geordnete Stufen oder besteht aus ganzen Zahlen: Dann passt ein anderes Modell vielleicht besser als die lineare Regression. Gerechnet wird, was hier gewählt ist.', 'The target has ordered levels or consists of whole numbers: another model may then fit better than linear regression. What is chosen here is calculated.')}</p>
      {#if zielSpalte && zielSpalte.art === 'zahl' && !modellPassend.includes('zaehl') && andereAlsZaehlwerte(zielZahlen)}<p class="hilfe">{L(`Zähldaten-Regression braucht ganze Zahlen ab 0; ${zitat(name(zielSpalte.name))} enthält andere Werte.`, `Count regression needs whole numbers from 0; ${zitat(name(zielSpalte.name))} contains other values.`)}</p>{/if}
      {#if modellArtEff === 'multi' && katStufen.length}
        <div class="eingabe" style="max-width:380px;margin-top:var(--a2)"><label for="modell-ref">{L('Vergleichskategorie', 'Reference category')}</label>
          <select id="modell-ref" aria-describedby="modell-ref-h" onchange={(ev) => (zus.modell.referenz = ev.currentTarget.value)}>
            {#each stufenMitFaellen(katStufen) as st (st)}<option value={st} selected={modellEffWahl.referenz === st}>{st}</option>{/each}
          </select>
          <p id="modell-ref-h" class="hilfe">{d('Jede andere Kategorie wird mit dieser verglichen. Wähle sie inhaltlich: eine übliche oder große Gruppe. Statable nimmt wie R die erste Kategorie, SPSS die letzte; die Odds Ratios sind dann Kehrwerte.', 'Jede andere Kategorie wird mit dieser verglichen. Wählen Sie sie inhaltlich: eine übliche oder große Gruppe. Statable nimmt wie R die erste Kategorie, SPSS die letzte; die Odds Ratios sind dann Kehrwerte.', 'Every other category is compared with this one. Choose it on substantive grounds: a usual or large group. Statable takes the first category like R, SPSS the last; the odds ratios are then reciprocals.')}</p></div>
      {/if}
      {#if modellArtEff === 'zaehl'}
        <fieldset class="zusatz-gruppe" style="margin-top:var(--a2)"><legend>{L('Poisson oder negativ-binomial', 'Poisson or negative binomial')}</legend>
          <div class="segment">{#each [['auto', L('automatisch', 'automatic')], ['poisson', 'Poisson'], ['negbin', L('negativ-binomial', 'negative binomial')]] as [w, tx]}<label data-begriff={w === 'poisson' ? 'poisson-regression' : w === 'negbin' ? 'negativ-binomial-regression' : undefined}><input type="radio" name="zaehl-modell" value={w} bind:group={zus.modell.zaehl}>{tx}</label>{/each}</div>
          <p class="hilfe">{L('Automatisch prüft Statable die Überdispersion und nennt den Grund im Ergebnis. Poisson trotz Überdispersion macht die p-Werte zu klein; das Ergebnis weist darauf hin.', 'Automatic: Statable checks overdispersion and gives the reason in the result. Poisson despite overdispersion makes the p values too small; the result points this out.')}</p>
        </fieldset>
        <div class="eingabe" style="max-width:380px;margin-top:var(--a2)"><label for="modell-zeit">{L('Beobachtungszeit (optional)', 'Observation time (optional)')}</label>
          <select id="modell-zeit" aria-describedby="modell-zeit-h" onchange={(ev) => (zus.modell.zeit = ev.currentTarget.value)}>
            <option value="" selected={!zus.modell.zeit}>{L('keine (jeder Fall gleich lang beobachtet)', 'none (every case observed for the same time)')}</option>
            {#each zeitSpalten as sp (sp.name)}<option value={sp.name} selected={zus.modell.zeit === sp.name}>{lesbar(sp, true)}</option>{/each}
          </select>
          <p id="modell-zeit-h" class="hilfe">{d('Waren die Fälle unterschiedlich lange beobachtet, wähle die Spalte mit der Zeit (alle Werte größer als 0). Statable rechnet dann Raten je Zeiteinheit. Ohne Angabe verzerrt ungleich lange Beobachtung die Ergebnisse.', 'Waren die Fälle unterschiedlich lange beobachtet, wählen Sie die Spalte mit der Zeit (alle Werte größer als 0). Statable rechnet dann Raten je Zeiteinheit. Ohne Angabe verzerrt ungleich lange Beobachtung die Ergebnisse.', 'If the cases were observed for different lengths of time, choose the column with the time (all values greater than 0). Statable then calculates rates per unit of time. Without it, unequal observation time distorts the results.')}</p></div>
      {/if}
      {#if modellArtEff === 'nls'}
        <fieldset class="zusatz-gruppe" style="margin-top:var(--a2)"><legend>{L('Formel', 'Formula')}</legend>
          <div class="segment" role="radiogroup" aria-describedby="nls-h">{#each NLS_FORMELN as fm (fm)}<label data-begriff="nichtlineare-regression"><input type="radio" name="nls-formel" value={fm} checked={nlsFormel === fm} onchange={() => (zus.modell.formel = fm)}>{nlsFormelName(fm)}: {nlsFormelText(fm)}</label>{/each}</div>
          <p id="nls-h" class="hilfe">{d('Die Formel muss sachlich begründet sein: Wähle sie nicht danach, welche am besten passt. Genau eine Zahlenspalte dient als Vorhersage; für die Startwerte braucht es je nach Formel Werte über 0.', 'Die Formel muss sachlich begründet sein: Wählen Sie sie nicht danach, welche am besten passt. Genau eine Zahlenspalte dient als Vorhersage; für die Startwerte braucht es je nach Formel Werte über 0.', 'The formula must be justified by subject matter: do not choose it by which one fits best. Exactly one number column serves as the predictor; depending on the formula, the starting values need values above 0.')}</p>
        </fieldset>
      {/if}
      {#if modellArtEff === 'wls'}
        <div class="eingabe" style="max-width:380px;margin-top:var(--a2)"><label for="modell-gewicht">{L('Spalte mit den Präzisionsgewichten', 'Column with the precision weights')}</label>
          <select id="modell-gewicht" aria-describedby="modell-gewicht-h" onchange={(ev) => (zus.modell.zeit = ev.currentTarget.value)}>
            <option value="" selected={!zus.modell.zeit}>{L('bitte wählen', 'please choose')}</option>
            {#each zeitSpalten as sp (sp.name)}<option value={sp.name} selected={zus.modell.zeit === sp.name}>{lesbar(sp, true)}</option>{/each}
          </select>
          <p id="modell-gewicht-h" class="hilfe">{wlsNichtFallgewicht()}</p></div>
      {/if}
      {#if modellArtEff === 'quantil'}
        <fieldset class="zusatz-gruppe" style="margin-top:var(--a2)"><legend>{L('Quantile (τ)', 'Quantiles (τ)')}</legend>
          <div class="segment" role="group" aria-describedby="tau-h">{#each [...QR_TAU_ANGEBOT, ...vorhEff.tau.filter(t => !QR_TAU_ANGEBOT.includes(t))] as t (t)}<label data-begriff="quantilregression"><input type="checkbox" checked={vorhEff.tau.includes(t)} onchange={() => tauUmschalten(t)}>{tauText(t)}{t === 0.5 ? ` (${L('Median', 'median')})` : ''}</label>{/each}</div>
          <p id="tau-h" class="hilfe">{L('τ = ,50 ist der Median; τ = ,25 und ,75 sind das untere und das obere Viertel. Mehrere τ nebeneinander zeigen, ob der Zusammenhang am Rand anders ist als in der Mitte. Je näher τ an 0 oder 1 liegt, desto weniger Fälle bestimmen die Gerade.', 'τ = .50 is the median; τ = .25 and .75 are the lower and the upper quarter. Several τ side by side show whether the relationship differs at the edge from the middle. The closer τ is to 0 or 1, the fewer cases determine the line.')}</p>
          <div class="eingabe" style="max-width:380px;margin-top:var(--a2)"><label for="tau-frei">{L('Eigenes τ (zwischen 0 und 1)', 'Own τ (between 0 and 1)')}</label>
            <div style="display:flex;gap:var(--a2)"><input type="text" id="tau-frei" inputmode="decimal" autocomplete="off" bind:value={tauFrei} onkeydown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); tauFreiDazu(); } }}><button class="k leise" type="button" onclick={tauFreiDazu}>{L('Hinzufügen', 'Add')}</button></div></div>
          {#if tauFehler}<p class="hilfe" role="alert">{tauFehler}</p>{/if}
        </fieldset>
        <fieldset class="zusatz-gruppe" style="margin-top:var(--a2)"><legend>{L('Intervalle', 'Intervals')}</legend>
          <div class="segment" role="radiogroup" aria-describedby="qki-h">{#each [['standard', L('Nach der Fallzahl (Bootstrap)', 'By the number of cases (bootstrap)')], ['rang', L('Rang-Umkehr', 'Rank inversion')]] as [w, tx]}<label data-begriff={w === 'standard' ? 'bootstrap' : undefined}><input type="radio" name="quantil-ki" value={w} checked={vorhEff.ki === w} onchange={() => vorhSchreiben({ ki: w as 'standard' | 'rang' })}>{tx}</label>{/each}</div>
          <p id="qki-h" class="hilfe">{vorhEff.ki === 'rang' ? L('Die Rang-Umkehr (Koenker) gibt asymmetrische Intervalle ohne Standardfehler und ohne p. Bricht sie bei diesen Daten ab, nimmt Statable den Bootstrap und sagt es.', 'The rank inversion (Koenker) gives asymmetric intervals without a standard error and without p. If it breaks down with these data, Statable uses the bootstrap and says so.') : L('Bis 1000 Fälle rechnet Statable den Fall-Bootstrap (2000 Ziehungen, fester Startwert, Perzentil-Intervall), darüber die nid-Näherung. Das Niveau ist immer 95 %.', 'Up to 1000 cases Statable calculates the case bootstrap (2000 draws, fixed seed, percentile interval), above that the nid approximation. The level is always 95%.')}</p>
        </fieldset>
      {/if}
      {#if modellArtEff === 'penal'}
        <fieldset class="zusatz-gruppe" style="margin-top:var(--a2)"><legend>{L('Art der Strafe', 'Kind of penalty')}</legend>
          <div class="segment" role="radiogroup" aria-describedby="alpha-h">{#each [[0, 'Ridge (α = 0)'], [1, 'Lasso (α = 1)'], [0.5, 'Elastic Net (α = ,5)']] as [w, tx]}<label data-begriff={w === 0 ? 'ridge' : w === 1 ? 'lasso' : 'elastic-net'}><input type="radio" name="straf-alpha" value={w} checked={w === 0.5 ? vorhEff.alpha > 0 && vorhEff.alpha < 1 : vorhEff.alpha === w} onchange={() => vorhSchreiben({ alpha: w === 0.5 && vorhEff.alpha > 0 && vorhEff.alpha < 1 ? vorhEff.alpha : (w as number) })}>{tx}</label>{/each}</div>
          <p id="alpha-h" class="hilfe">{L('Ridge zieht alle Koeffizienten zur Null, behält aber alle Größen. Lasso setzt unwichtige Größen ganz auf Null und wählt so aus. Elastic Net mischt beides und hilft, wenn Größen eng zusammenhängen.', 'Ridge pulls all coefficients towards zero but keeps all predictors. Lasso sets unimportant predictors exactly to zero and so selects. Elastic net mixes both and helps when predictors are closely related.')}</p>
        </fieldset>
        <fieldset class="zusatz-gruppe" style="margin-top:var(--a2)"><legend>{L('Stärke der Strafe (λ)', 'Strength of the penalty (λ)')}</legend>
          <div class="segment" role="radiogroup" aria-describedby="regel-h">{#each [['se1', L('Einfacheres Modell (Ein-Standardfehler-Regel)', 'Simpler model (one-standard-error rule)')], ['min', L('Kleinster Fehler', 'Smallest error')]] as [w, tx]}<label><input type="radio" name="straf-regel" value={w} checked={vorhEff.regel === w} onchange={() => vorhSchreiben({ regel: w as 'se1' | 'min' })}>{tx}</label>{/each}</div>
          <p id="regel-h" class="hilfe">{L('Die Stärke wählt eine 5 × 10-fache Kreuzvalidierung nach dem Fehler an neuen Fällen. Die Ein-Standardfehler-Regel nimmt das einfachste Modell, dessen Fehler noch im Schwankungsbereich des besten liegt; sie wählt stabiler aus.', 'A 5 × 10-fold cross-validation chooses the strength by the error on new cases. The one-standard-error rule takes the simplest model whose error still lies within the fluctuation range of the best; it selects more stably.')}</p>
          <label data-begriff="standardisierung" class="schalter" style="margin-top:var(--a2)"><input type="checkbox" checked={vorhEff.standardisieren} onchange={(ev) => vorhSchreiben({ standardisieren: ev.currentTarget.checked })}>{L('Spalten standardisieren', 'Standardize the columns')}</label>
          <p class="hilfe">{L('Ohne Standardisierung hängt die Strafe von der Einheit jeder Spalte ab (Stunden gegen Tage). Nur für Fachleute abschalten.', 'Without standardization the penalty depends on the unit of each column (hours versus days). Switch off for specialists only.')}</p>
        </fieldset>
      {/if}
      {#if kursArt}<p class="hilfe"><HilfeLink id={kursArt === 'probit' ? 'probit-regression' : kursArt === 'nls' ? 'nichtlineare-regression' : 'gewichtete-regression'} text={kursArt === 'probit' ? L('Hilfe: Probit-Regression', 'Help: probit regression') : kursArt === 'nls' ? L('Hilfe: Nichtlineare Regression', 'Help: nonlinear regression') : L('Hilfe: Gewichtete Regression', 'Help: weighted regression')} /></p>{/if}
      {#if vorhArt}<p class="hilfe"><HilfeLink id={vorhArt === 'quantil' ? 'quantilregression' : 'strafregression'} text={vorhArt === 'quantil' ? L('Hilfe: Quantilregression', 'Help: quantile regression') : L('Hilfe: Ridge, Lasso und Elastic Net', 'Help: ridge, lasso and elastic net')} /></p>{/if}
      {#if katHilfeId(katArt)}<p class="hilfe"><HilfeLink id={katHilfeId(katArt)!} text={katArt === 'ordreg' ? L('Hilfe: Ordinale Regression', 'Help: ordinal regression') : katArt === 'multreg' ? L('Hilfe: Multinomiale Regression', 'Help: multinomial regression') : L('Hilfe: Zähldaten-Regression', 'Help: count regression')} /></p>{/if}
    </fieldset>
  </div>
{/if}
{/snippet}
{#snippet zusatzWege()}
{#if verfahren && verfahren.id === 'mediation'}
  <ProzessWege bind:zus vierte={werte.l4[0] ? name(werte.l4[0]) : null} wInfo={prozessWInfo} eigenFehler={prozessEigen === null} wName={werte.l4[0] ? name(werte.l4[0]) : 'W'} />
  <div class="zusatz-wahl" style="margin-top:var(--a3)">
    <fieldset class="zusatz-gruppe"><legend>{L('Intervall des indirekten Effekts', 'Interval of the indirect effect')}</legend>
      <div class="segment" role="radiogroup" aria-describedby="boot-art-h">{#each [['perzentil', L('Perzentil-Intervall (Standard)', 'Percentile interval (default)')], ['bca', L('BCa-Intervall', 'BCa interval')]] as [w, tx]}<label data-begriff={w === 'bca' ? 'bca' : 'perzentilintervall'}><input type="radio" name="boot-art" value={w} checked={(zus.bootArt ?? 'perzentil') === w} onchange={() => (zus.bootArt = w as 'perzentil' | 'bca')}>{tx}</label>{/each}</div>
      <p id="boot-art-h" class="hilfe">{(zus.bootArt ?? 'perzentil') === 'bca'
        ? d('BCa korrigiert Verzerrung und Schiefe der Ziehungen und gilt in vielen Büchern als genauer. Hayes empfiehlt trotzdem das Perzentil-Intervall: Das verzerrungskorrigierte Intervall hält die Fehlerquote bei der Mediation schlechter ein. Der Startwert und die Zahl der Ziehungen stehen unter der Tabelle.', 'BCa korrigiert Verzerrung und Schiefe der Ziehungen und gilt in vielen Büchern als genauer. Hayes empfiehlt trotzdem das Perzentil-Intervall: Das verzerrungskorrigierte Intervall hält die Fehlerquote bei der Mediation schlechter ein. Der Startwert und die Zahl der Ziehungen stehen unter der Tabelle.', 'BCa corrects bias and skew of the draws and is regarded as more accurate in many books. Hayes still recommends the percentile interval: the bias-corrected interval keeps the error rate worse in mediation. The seed and the number of draws are given below the table.')
        : d('Das Perzentil-Intervall ist die Voreinstellung (wie in PROCESS von Hayes): Es nimmt die mittleren 95 % der 5000 Ziehungen. Unter „BCa-Intervall“ kannst du die korrigierte Form wählen.', 'Das Perzentil-Intervall ist die Voreinstellung (wie in PROCESS von Hayes): Es nimmt die mittleren 95 % der 5000 Ziehungen. Unter „BCa-Intervall“ können Sie die korrigierte Form wählen.', 'The percentile interval is the default (as in Hayes\' PROCESS): it takes the middle 95% of the 5000 draws. Under "BCa interval" you can choose the corrected form.')}</p>
      <p class="hilfe"><HilfeLink id="bootstrap-intervalle" text={L('Hilfe: Bootstrap-Intervalle', 'Help: bootstrap intervals')} /></p>
    </fieldset>
  </div>
{/if}
{#if verfahren && verfahren.id === 'kreuz' && risikoMoeglich}
  <div class="zusatz-wahl" style="margin-top:var(--a3)">
    <fieldset class="zusatz-gruppe"><legend>{L('Studiendesign', 'Study design')}</legend>
      <div class="segment" role="radiogroup" aria-describedby="design-h">{#each [['kohorte', L('Kohorte oder Experiment (Standard)', 'Cohort or experiment (default)')], ['fallKontrolle', L('Fall-Kontroll-Studie', 'Case-control study')]] as [w, tx]}<label data-begriff={w === 'fallKontrolle' ? 'fall-kontroll-studie' : 'kohortenstudie'}><input type="radio" name="zus-design" value={w} checked={zus.design === w} onchange={() => (zus.design = w as 'kohorte' | 'fallKontrolle')}>{tx}</label>{/each}</div>
      <p id="design-h" class="hilfe">{zus.design === 'fallKontrolle' ? L('Bei einer Fall-Kontroll-Studie legt die Untersuchung fest, wie viele Fälle und Kontrollen dabei sind. Risiken, Risikodifferenz, relatives Risiko und NNT wären dann nicht zu deuten; Statable zeigt nur das Odds Ratio.', 'In a case-control study the investigation itself fixes how many cases and controls take part. Risks, risk difference, relative risk and NNT could then not be interpreted; Statable shows only the odds ratio.') : L('Kohorte oder Experiment: Die Gruppen werden verfolgt, dann zeigt sich, wer das Ereignis hat. Im Ergebnis lassen sich Risikodifferenz, relatives Risiko und NNT einschalten.', 'Cohort or experiment: the groups are followed to see who has the event. In the result you can switch on risk difference, relative risk and NNT.')}</p>
      <p class="hilfe"><HilfeLink id="risikomasse" text={L('Hilfe: Risikomaße', 'Help: risk measures')} /></p>
    </fieldset>
  </div>
{/if}
{#if verfahren && verfahren.id === 'verteilung' && umfrageAn}
  <UmfrageWege bind:zus />
{/if}
{#if kreuzWegeMoeglich}
  <KreuzWege bind:zus zeile={{ name: werte.l2[0]!, art: masseArtVon(werte.l2[0]!), stufen: ctx.verschieden(werte.l2[0]!) }} spalte={{ name: werte.l1[0]!, art: masseArtVon(werte.l1[0]!), stufen: ctx.verschieden(werte.l1[0]!) }}
    textcodes={[werte.l1[0]!, werte.l2[0]!].some(n => spalteNach(n)?.art === 'text' && spalteNach(n)?.niveau === 'ordinal')} schichtSpalten={schichtKandidaten} umfrage={aktivesGewicht()?.art === 'umfrage'} />
{/if}
{#if verfahren && verfahren.id === 'kaplanmeier'}
  <div class="zusatz-wahl" style="margin-top:var(--a3)">
    <p class="hilfe">{coxAn ? d('Statable rechnet eine Cox-Regression mit den gewählten Spalten: Hazard Ratios mit Intervallen, Likelihood-Quotienten-Test und die Prüfung, ob die Hazards über die Zeit proportional sind. Dazu lädt Statable R (Paket survival). Gleiche Zeiten behandelt Statable nach Efron, SPSS nach Breslow.', 'Statable rechnet eine Cox-Regression mit den gewählten Spalten: Hazard Ratios mit Intervallen, Likelihood-Quotienten-Test und die Prüfung, ob die Hazards über die Zeit proportional sind. Dazu lädt Statable R (Paket survival). Gleiche Zeiten behandelt Statable nach Efron, SPSS nach Breslow.', 'Statable calculates a Cox regression with the chosen columns: hazard ratios with intervals, a likelihood ratio test and a check of whether the hazards are proportional over time. For this Statable loads R (package survival). Statable handles tied times by Efron, SPSS by Breslow.')
      : d('Mehrere Angaben zugleich auf das Risiko wirken lassen (Cox-Regression)? Wähle oben die Spalten, die das Risiko erklären sollen. Mit einer Spalte, die Gruppen nennt, vergleicht der Log-Rank-Test nur die Kurven.', 'Mehrere Angaben zugleich auf das Risiko wirken lassen (Cox-Regression)? Wählen Sie oben die Spalten, die das Risiko erklären sollen. Mit einer Spalte, die Gruppen nennt, vergleicht der Log-Rank-Test nur die Kurven.', 'Let several characteristics act on the risk at once (Cox regression)? Choose the columns above that are meant to explain the risk. With a column that names groups, the log-rank test only compares the curves.')}</p>
    <p class="hilfe"><HilfeLink id="cox-regression" text={L('Hilfe: Cox-Regression', 'Help: Cox regression')} /></p>
  </div>
  <div class="zusatz-wahl" style="margin-top:var(--a3)">
    <label data-begriff="sterbetafel" class="schalter"><input type="checkbox" checked={ueb.sterbe.an} onchange={(ev) => uebSetze({ sterbe: { ...ueb.sterbe, an: ev.currentTarget.checked } })}>{L('Sterbetafel statt Kaplan-Meier-Kurve', 'Life table instead of the Kaplan-Meier curve')}</label>
    <p class="hilfe">{L('Die Sterbetafel (auch: Lebenstafel, Überlebenstafel) fasst die Zeit in feste Abschnitte zusammen und zeigt je Abschnitt, wie viele noch dabei waren, wie viele das Ereignis hatten und wie viel Anteil noch ohne Ereignis ist - mit Standardfehlern, Ausfallrate (Hazard) und Median. So rechnet auch SPSS (Analysieren > Überleben > Sterbetafeln). Mit Gruppen vergleicht Statable sie nach Wilcoxon (Gehan).', 'The life table (also: actuarial table, survival table) groups the time into fixed intervals and shows for each interval how many were still in, how many had the event and what proportion is still without the event - with standard errors, hazard rate and median. SPSS does the same (Analyze > Survival > Life Tables). With groups Statable compares them by Wilcoxon (Gehan).')}</p>
    {#if ueb.sterbe.an}
      <div class="zusatz-felder" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr));gap:var(--a3);max-width:760px">
        <div class="eingabe"><label for="st-breite">{L('Breite eines Intervalls (leer: Vorschlag)', 'Width of an interval (empty: suggestion)')}</label><input id="st-breite" type="text" inputmode="decimal" autocomplete="off" placeholder={sterbeVorgabe ? String(sterbeVorgabe.breite).replace('.', ',') : ''} value={ueb.sterbe.breite} oninput={(ev) => uebSetze({ sterbe: { ...ueb.sterbe, breite: ev.currentTarget.value } })}></div>
        <div class="eingabe"><label for="st-ende">{L('Ende der Intervalle (leer: Vorschlag)', 'End of the intervals (empty: suggestion)')}</label><input id="st-ende" type="text" inputmode="decimal" autocomplete="off" placeholder={sterbeVorgabe ? String(sterbeVorgabe.ende).replace('.', ',') : ''} value={ueb.sterbe.ende} oninput={(ev) => uebSetze({ sterbe: { ...ueb.sterbe, ende: ev.currentTarget.value } })}></div>
        <div class="eingabe"><label for="st-einheit">{L('Zeiteinheit', 'Time unit')}</label><select id="st-einheit" onchange={(ev) => uebSetze({ sterbe: { ...ueb.sterbe, einheit: ev.currentTarget.value } })}><option value="" selected={ueb.sterbe.einheit === ''}>{L('keine Angabe', 'not specified')}</option>{#each ZEITEINHEITEN as u (u)}<option value={u} selected={ueb.sterbe.einheit === u}>{zeiteinheitWort(u)}</option>{/each}{#if ueb.sterbe.einheit && !zeiteinheitId(ueb.sterbe.einheit)}<option value={ueb.sterbe.einheit} selected>{ueb.sterbe.einheit}</option>{/if}</select></div>
      </div>
      <p class="hilfe">{L('Das Ende der Intervalle ist der Anfang des offenen letzten Intervalls. Die Wahl der Intervalle ändert das Ergebnis; im Ergebnis lässt sie sich ändern.', 'The end of the intervals is the start of the open last interval. The choice of intervals changes the result; you can change it in the result.')}</p>
    {/if}
    <p class="hilfe"><HilfeLink id="sterbetafel" text={L('Hilfe: Sterbetafel', 'Help: life table')} /></p>
  </div>
  <div class="zusatz-wahl" style="margin-top:var(--a3)">
    <label data-begriff="cox-zeitabhaengig" class="schalter"><input type="checkbox" checked={ueb.zeit.an} disabled={!coxAn} onchange={(ev) => { if (ev.currentTarget.checked) zeitVorschlag(); else uebSetze({ zeit: { ...ueb.zeit, an: false } }); }}>{L('Eine Angabe ändert sich im Lauf der Zeit (zeitabhängige Größe)', 'A characteristic changes over time (time-dependent covariate)')}</label>
    <p class="hilfe">{coxAn ? d('Dann muss die Tabelle in Intervall-Form sein: eine Zeile je Person und Abschnitt mit dem Start, dem Ende (die Zeit oben), dem Ereignis (nur in der letzten Zeile der Person) und dem Wert, der in diesem Abschnitt galt. Hast du je Person nur den Zeitpunkt eines Wechsels (zum Beispiel einer Transplantation), baut der Assistent „Zeitpunkte je Person → Intervalle“ unter Daten > Umstrukturieren diese Tabelle.', 'Dann muss die Tabelle in Intervall-Form sein: eine Zeile je Person und Abschnitt mit dem Start, dem Ende (die Zeit oben), dem Ereignis (nur in der letzten Zeile der Person) und dem Wert, der in diesem Abschnitt galt. Haben Sie je Person nur den Zeitpunkt eines Wechsels (zum Beispiel einer Transplantation), baut der Assistent „Zeitpunkte je Person → Intervalle“ unter Daten > Umstrukturieren diese Tabelle.', 'Then the table must be in interval form: one row per person and interval with the start, the end (the time above), the event (only in the last row of the person) and the value that applied in this interval. If you only have the time of a switch per person (for example a transplant), the assistant "Time points per person → intervals" under Data > Reshape builds this table.')
      : d('Wähle oben zuerst die Spalten, die das Risiko erklären sollen (Cox-Regression). Eine davon ist die Angabe, die sich im Lauf der Zeit ändert.', 'Wählen Sie oben zuerst die Spalten, die das Risiko erklären sollen (Cox-Regression). Eine davon ist die Angabe, die sich im Lauf der Zeit ändert.', 'First choose the columns above that are meant to explain the risk (Cox regression). One of them is the characteristic that changes over time.')}</p>
    {#if ueb.zeit.an && coxAn}
      <div class="zusatz-felder" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr));gap:var(--a3);max-width:760px">
        <div class="eingabe"><label for="zt-kennung">{L('Kennung der Person', 'ID of the person')}</label><select id="zt-kennung" onchange={(ev) => uebSetze({ zeit: { ...ueb.zeit, kennung: ev.currentTarget.value } })}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each s.spalten.filter(c => ![werte.l1[0], werte.l2[0], ...werte.l4].includes(c.name)) as c (c.name)}<option value={c.name} selected={ueb.zeit.kennung === c.name}>{name(c.name)}</option>{/each}</select></div>
        <div class="eingabe"><label for="zt-start">{L('Start des Abschnitts', 'Start of the interval')}</label><select id="zt-start" onchange={(ev) => uebSetze({ zeit: { ...ueb.zeit, start: ev.currentTarget.value } })}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each s.spalten.filter(c => c.art === 'zahl' && ![werte.l1[0], werte.l2[0], ...werte.l4].includes(c.name)) as c (c.name)}<option value={c.name} selected={ueb.zeit.start === c.name}>{name(c.name)}</option>{/each}</select></div>
        <div class="eingabe"><label for="zt-wert">{L('Die Angabe, die sich ändert', 'The characteristic that changes')}</label><select id="zt-wert" onchange={(ev) => uebSetze({ zeit: { ...ueb.zeit, wert: ev.currentTarget.value } })}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each werte.l4 as n (n)}<option value={n} selected={ueb.zeit.wert === n}>{name(n)}</option>{/each}</select></div>
      </div>
      <p class="hilfe">{unsterblichkeitSatz()}</p>
    {/if}
    <p class="hilfe"><HilfeLink id="cox-zeitabhaengig" text={L('Hilfe: Cox-Regression mit zeitabhängiger Größe', 'Help: Cox regression with a time-dependent covariate')} /> · <a href="#umformen">{L('Assistent: Zeitpunkte je Person → Intervalle', 'Assistant: time points per person → intervals')}</a></p>
  </div>
  <div class="zusatz-wahl" style="margin-top:var(--a3)">
    <label data-begriff="aft-modell" class="schalter"><input type="checkbox" checked={ueb.aft.an} disabled={!coxAn || ueb.zeit.an} onchange={(ev) => uebSetze({ aft: { ...ueb.aft, an: ev.currentTarget.checked } })}>{L('Zusätzlich das AFT-Modell rechnen (Zeitverhältnis)', 'Also calculate the AFT model (time ratio)')}</label>
    <p class="hilfe">{coxAn && !ueb.zeit.an ? d('Das AFT-Modell sagt, um welchen Faktor sich die Zeit bis zum Ereignis ändert („doppelt so lang“), statt das Risiko zu vergleichen. Statable lädt dafür R (Paket survival) und zeigt den AIC aller vier Verteilungen. Die Zeit muss größer als 0 sein. Das Vorzeichen von b ist hier entgegengesetzt zur Cox-Regression: positiv heißt längere Zeit.', 'Das AFT-Modell sagt, um welchen Faktor sich die Zeit bis zum Ereignis ändert („doppelt so lang“), statt das Risiko zu vergleichen. Statable lädt dafür R (Paket survival) und zeigt den AIC aller vier Verteilungen. Die Zeit muss größer als 0 sein. Das Vorzeichen von b ist hier entgegengesetzt zur Cox-Regression: positiv heißt längere Zeit.', 'The AFT model says by which factor the time to the event changes ("twice as long") instead of comparing the risk. Statable loads R (package survival) for it and shows the AIC of all four distributions. The time must be greater than 0. The sign of b is opposite to the Cox regression here: positive means a longer time.')
      : d('Wähle oben zuerst die Spalten, die das Zeitverhältnis erklären sollen (die Spalten der Cox-Regression). Mit einer zeitabhängigen Größe gibt es das AFT-Modell nicht.', 'Wählen Sie oben zuerst die Spalten, die das Zeitverhältnis erklären sollen (die Spalten der Cox-Regression). Mit einer zeitabhängigen Größe gibt es das AFT-Modell nicht.', 'First choose the columns above that are meant to explain the time ratio (the columns of the Cox regression). With a time-dependent covariate there is no AFT model.')}</p>
    {#if ueb.aft.an && coxAn && !ueb.zeit.an}
      <div class="zusatz-felder" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr));gap:var(--a3);max-width:760px">
        <div class="eingabe"><label for="aft-dist">{L('Verteilung der Zeit', 'Distribution of the time')}</label><select id="aft-dist" onchange={(ev) => uebSetze({ aft: { ...ueb.aft, dist: ev.currentTarget.value } })}>{#each AFT_VERTEILUNGEN as v (v)}<option data-begriff={v === 'weibull' ? 'weibull' : v === 'exponential' ? 'exponentialverteilung' : v === 'lognormal' ? 'lognormal' : undefined} value={v} selected={ueb.aft.dist === v}>{verteilungName(v)}{v === 'weibull' ? ` (${L('Vorschlag', 'suggested')})` : ''}</option>{/each}</select></div>
      </div>
      <p class="hilfe">{L('Die Verteilung wählt die Person nach der Sachlage; der AIC im Ergebnis zeigt nur, welche zu den Daten am besten passt, und ist kein Test.', 'The person chooses the distribution according to the subject matter; the AIC in the result only shows which one fits the data best and is not a test.')}</p>
    {/if}
    <p class="hilfe"><HilfeLink id="aft-modell" text={L('Hilfe: AFT-Modell', 'Help: AFT model')} /></p>
  </div>
  <div class="zusatz-wahl" style="margin-top:var(--a3)">
    <div class="eingabe"><label for="kn-art">{L('Gehören mehrere Zeilen zur selben Person oder Gruppe?', 'Do several rows belong to the same person or group?')}</label>
      <select id="kn-art" disabled={!coxAn || ueb.zeit.an} onchange={(ev) => uebSetze({ kennung: { ...ueb.kennung, art: ev.currentTarget.value } })}>
        <option value="aus" selected={ueb.kennung.art === 'aus'}>{L('Nein, jede Zeile ist eine Person', 'No, every row is one person')}</option>
        <option data-begriff="robuste-standardfehler" value="cluster" selected={ueb.kennung.art === 'cluster'}>{L('Ja: robuste Standardfehler (Cluster, Vorschlag)', 'Yes: robust standard errors (cluster, suggested)')}</option>
        <option data-begriff="frailty" value="gamma" selected={ueb.kennung.art === 'gamma'}>{L('Ja: Frailty je Gruppe (gamma, fortgeschritten)', 'Yes: frailty per group (gamma, advanced)')}</option></select></div>
    <p class="hilfe">{coxAn && !ueb.zeit.an ? d('Zum Beispiel Würfe, Zentren oder wiederholte Ereignisse bei derselben Person: Solche Zeilen sind nicht unabhängig. Mit „Cluster“ bleiben die Hazard Ratios, nur die Standardfehler werden ehrlicher. Die Frailty fügt jeder Gruppe eine eigene Neigung hinzu und gibt eine andere (bedingte) Hazard Ratio. Mindestens zwei Gruppen mit je mindestens zwei Zeilen, besser 20 Gruppen.', 'Zum Beispiel Würfe, Zentren oder wiederholte Ereignisse bei derselben Person: Solche Zeilen sind nicht unabhängig. Mit „Cluster“ bleiben die Hazard Ratios, nur die Standardfehler werden ehrlicher. Die Frailty fügt jeder Gruppe eine eigene Neigung hinzu und gibt eine andere (bedingte) Hazard Ratio. Mindestens zwei Gruppen mit je mindestens zwei Zeilen, besser 20 Gruppen.', 'For example litters, centers or repeated events in the same person: such rows are not independent. With "cluster" the hazard ratios stay and only the standard errors become more honest. The frailty adds a tendency of its own to each group and gives another (conditional) hazard ratio. At least two groups with at least two rows each, better 20 groups.')
      : d('Wähle oben zuerst die Spalten der Cox-Regression. Mit einer zeitabhängigen Größe gibt es keine Kennung.', 'Wählen Sie oben zuerst die Spalten der Cox-Regression. Mit einer zeitabhängigen Größe gibt es keine Kennung.', 'First choose the columns of the Cox regression above. With a time-dependent covariate there is no identifier.')}</p>
    {#if ueb.kennung.art !== 'aus' && coxAn && !ueb.zeit.an}
      <div class="zusatz-felder" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr));gap:var(--a3);max-width:760px">
        <div class="eingabe"><label for="kn-spalte">{L('Kennung der Person oder Gruppe', 'Identifier of the person or group')}</label><select id="kn-spalte" onchange={(ev) => uebSetze({ kennung: { ...ueb.kennung, spalte: ev.currentTarget.value } })}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each s.spalten.filter(c => ![werte.l1[0], werte.l2[0], ...werte.l4].includes(c.name)) as c (c.name)}<option value={c.name} selected={ueb.kennung.spalte === c.name}>{name(c.name)}</option>{/each}</select></div>
        <div class="eingabe"><label for="kn-ties">{L('Gleiche Zeiten (Bindungen)', 'Tied times (ties)')}</label><select id="kn-ties" onchange={(ev) => uebSetze({ kennung: { ...ueb.kennung, ties: ev.currentTarget.value } })}><option data-begriff="bindung" value="efron" selected={ueb.kennung.ties !== 'breslow'}>Efron ({L('Vorschlag', 'suggested')})</option><option data-begriff="bindung" value="breslow" selected={ueb.kennung.ties === 'breslow'}>Breslow</option></select></div>
      </div>
      <p class="hilfe">{L('Statable rechnet entweder mit Cluster oder mit Frailty, nie beides zugleich. Die Kennung geht als Zahlencode nach R, nicht als Text.', 'Statable calculates either with cluster or with frailty, never both. The identifier goes to R as a numeric code, not as text.')}</p>
    {/if}
    <p class="hilfe"><HilfeLink id="cox-frailty" text={L('Hilfe: Cluster und Frailty', 'Help: cluster and frailty')} /></p>
  </div>
{/if}
{#if verfahren && verfahren.id === 'vorhersage'}
  {@render modellWege()}
  <div class="zusatz-wahl" style="margin-top:var(--a3)">
    <label data-begriff="hierarchische-regression" class="schalter"><input type="checkbox" bind:checked={zus.hier.an} disabled={!hierMoeglich}>{L('Blöcke bilden (hierarchische Regression)', 'Build blocks (hierarchical regression)')}</label>
    {#if !hierMoeglich}
      <p class="hilfe">{L('Blöcke gibt es bei der linearen Regression mit mindestens zwei Spalten unter „Woraus?“. Hat das Ziel genau zwei Werte (logistische Regression), rechnet Statable keine Blöcke.', 'Blocks are available for linear regression with at least two columns under "Predicted from what?". If the target has exactly two values (logistic regression), Statable does not calculate blocks.')}</p>
    {:else if zus.hier.an}
      <fieldset class="zusatz-gruppe" style="margin-top:var(--a2)"><legend>{L('Zahl der Blöcke', 'Number of blocks')}</legend>
        <div class="segment">
          <label><input type="radio" name="hier-anzahl" value={2} bind:group={zus.hier.anzahl}>{L('2 Blöcke', '2 blocks')}</label>
          <label><input type="radio" name="hier-anzahl" value={3} bind:group={zus.hier.anzahl} disabled={werte.l2.length < 3}>{L('3 Blöcke', '3 blocks')}</label>
        </div>
      </fieldset>
      <fieldset class="zusatz-gruppe" style="margin-top:var(--a2)"><legend>{L('Welche Spalte in welchen Block?', 'Which column goes into which block?')}</legend>
        {#each werte.l2 as n (n)}
          <div class="eingabe"><label for="hier-b-{n}">{name(n)}</label>
            <select id="hier-b-{n}" aria-describedby="hier-h" style="max-width:14ch" onchange={(ev) => (zus.hier.block[n] = Number(ev.currentTarget.value))}>
              {#each Array.from({ length: zus.hier.anzahl }, (_, i) => i + 1) as b (b)}<option value={b} selected={hierBlockVon(werte.l2, zus.hier, n) === b}>{L(`Block ${b}`, `Block ${b}`)}</option>{/each}
            </select></div>
        {/each}
        <p id="hier-h" class="hilfe">{d('Lege die Reihenfolge der Blöcke aus der Theorie fest, bevor du das Ergebnis siehst. Block 1 sind meist Kontrollgrößen (zum Beispiel Alter), danach folgt, was geprüft werden soll. Alle Blöcke rechnen auf denselben Fällen.', 'Legen Sie die Reihenfolge der Blöcke aus der Theorie fest, bevor Sie das Ergebnis sehen. Block 1 sind meist Kontrollgrößen (zum Beispiel Alter), danach folgt, was geprüft werden soll. Alle Blöcke rechnen auf denselben Fällen.', 'Decide the order of the blocks from theory before you see the result. Block 1 is usually control variables (for example age), followed by what is to be tested. All blocks are calculated on the same cases.')}</p>
      </fieldset>
      <p class="hilfe"><HilfeLink id="hierarchische-regression" text={L('Hilfe: Hierarchische Regression', 'Help: hierarchical regression')} /></p>
    {/if}
  </div>
{/if}
{#if verfahren && (verfahren.id === 'gruppen' || verfahren.id === 'praepost') && !jaNeinFall(verfahren, werte)}
  {@const dl = deltaAusText(zus.tost.delta)}
  <div class="zusatz-wahl" style="margin-top:var(--a3)">
    <label data-begriff="aequivalenztest" class="schalter"><input id="zus-tost-an" type="checkbox" bind:checked={zus.tost.an} disabled={!tostMoeglich}>{L('Auf Gleichwertigkeit prüfen (Äquivalenztest)', 'Test for equivalence (equivalence test)')}</label>
    {#if !tostMoeglich}
      <p class="hilfe">{L('Der Äquivalenztest vergleicht genau zwei Gruppen, ohne zweite Gruppierung und ohne Kontrollvariable.', 'The equivalence test compares exactly two groups, without a second grouping and without a control variable.')}</p>
    {:else if zus.tost.an}
      <div class="eingabe"><label for="zus-delta">{L('Grenze Δ (Pflichtangabe)', 'Bound Δ (required)')}</label>
        <input id="zus-delta" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" bind:value={zus.tost.delta} placeholder={L('z. B. 0,5', 'e.g. 0.5')} aria-invalid={zus.tost.delta.trim() !== '' && dl === null ? 'true' : undefined} aria-describedby="zus-delta-h" style="max-width:10ch">
        <p id="zus-delta-h" class="hilfe">{d('Der größte Unterschied in den Einheiten der Messung, den du noch als gleichwertig gelten lässt. Begründe die Grenze vor der Auswertung, zum Beispiel mit dem kleinsten Unterschied, der in der Praxis zählt. Es gibt keinen Standardwert, und die Grenze nachträglich zu ändern, um ein Ergebnis zu erreichen, ist nicht zulässig.',
          'Der größte Unterschied in den Einheiten der Messung, den Sie noch als gleichwertig gelten lassen. Begründen Sie die Grenze vor der Auswertung, zum Beispiel mit dem kleinsten Unterschied, der in der Praxis zählt. Es gibt keinen Standardwert, und die Grenze nachträglich zu ändern, um ein Ergebnis zu erreichen, ist nicht zulässig.',
          'The largest difference in the units of the measure that you still accept as equivalent. Justify the bound before the analysis, for example with the smallest difference that matters in practice. There is no default value, and changing the bound afterwards to reach a result is not acceptable.')}
          <HilfeLink id="aequivalenztest-tost" text={L('Hilfe: Äquivalenztest', 'Help: equivalence test')} /></p>
        {#if zus.tost.delta.trim() !== '' && dl === null}<p class="hilfe" role="alert">{L('Die Grenze muss eine Zahl größer als 0 sein, zum Beispiel 0,5.', 'The bound must be a number greater than 0, for example 0.5.')}</p>
        {:else if dl === null}<p class="hilfe">{L('Ohne Grenze rechnet Statable den Äquivalenztest nicht.', 'Without a bound Statable does not calculate the equivalence test.')}</p>{/if}
      </div>
    {/if}
  </div>
{/if}
{#if verfahren?.id === 'praepost' && !jaNeinFall(verfahren, werte)}
  <div class="zusatz-wahl" style="margin-top:var(--a4)">
    <label data-begriff="reliable-change-index" class="schalter"><input id="zus-rci-an" type="checkbox" bind:checked={zus.rci.an}>{L('Verlässliche Veränderung je Person (Reliable Change Index)', 'Reliable change for each person (Reliable Change Index)')}</label>
    {#if zus.rci.an}
      <fieldset class="zusatz-gruppe" style="margin-top:var(--a2)"><legend>{L('Reliabilität (Pflichtangabe)', 'Reliability (required)')}</legend>
        <div class="segment">
          <label data-begriff="retest-reliabilitaet"><input type="radio" name="zus-rel" value="retest" bind:group={zus.rci.quelle}>{L('Reliabilität eingeben', 'Enter the reliability')}</label>
          <label data-begriff="cronbach-alpha"><input type="radio" name="zus-rel" value="alpha" bind:group={zus.rci.quelle} disabled={!alphaSkalen.length}>{L('Cronbachs Alpha aus diesen Daten', "Cronbach's alpha from these data")}</label>
        </div>
        {#if zus.rci.quelle === 'retest'}
          <div class="eingabe"><label for="zus-r">{L('Reliabilität r', 'Reliability r')}</label>
            <input id="zus-r" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" bind:value={zus.rci.r} placeholder={L('z. B. ,85', 'e.g. .85')} aria-invalid={zus.rci.r.trim() !== '' && reliabilitaetAusText(zus.rci.r) === null ? 'true' : undefined} aria-describedby="zus-r-h" style="max-width:10ch">
            <p id="zus-r-h" class="hilfe">{L('Die Retest-Reliabilität des Tests, etwa aus dem Testhandbuch: die Korrelation zweier Messungen bei unveränderten Personen. Das ist die eigentliche Wahl. Eine Zahl von 0 bis unter 1.', 'The retest reliability of the test, for example from the test manual: the correlation of two measurements in unchanged people. This is the proper choice. A number from 0 to below 1.')}</p></div>
        {:else}
          <div class="eingabe"><label for="zus-skala">{L('Skala der ersten Messung', 'Scale of the first measurement')}</label>
            <select id="zus-skala" bind:value={zus.rci.skala} aria-describedby="zus-skala-h">
              <option value="">{L('Skala wählen …', 'Choose a scale …')}</option>
              {#each alphaSkalen as sk (sk.name)}<option value={sk.name}>{sk.name} ({sk.fragen.length} {L('Items', 'items')})</option>{/each}
            </select>
            <p id="zus-skala-h" class="hilfe">{L('Statable rechnet Cronbachs Alpha aus den Items dieser Skala bei der ersten Messung (Personen mit allen Items). Alpha ist nur ein Ersatz für die Retest-Reliabilität: Es misst die innere Konsistenz, nicht die Stabilität, und fällt meist höher aus.', "Statable calculates Cronbach's alpha from the items of this scale at the first measurement (people with all items). Alpha is only a substitute for the retest reliability: it measures internal consistency, not stability, and is usually higher.")}</p></div>
        {/if}
      </fieldset>
      <fieldset class="zusatz-gruppe" style="margin-top:var(--a2)"><legend>{L('Hohe Werte sind … (Pflichtangabe)', 'High values are … (required)')}</legend>
        <div class="segment">
          <label><input type="radio" name="zus-richtung" value="besser" bind:group={zus.rci.richtung}>{L('Hohe Werte sind besser', 'High values are better')}</label>
          <label><input type="radio" name="zus-richtung" value="schlechter" bind:group={zus.rci.richtung}>{L('Hohe Werte sind schlechter', 'High values are worse')}</label>
        </div>
      </fieldset>
      <p class="hilfe"><HilfeLink id="reliable-change-index" text={L('Hilfe: Reliable Change Index', 'Help: Reliable Change Index')} /></p>
    {/if}
  </div>
{/if}
{#if zufallMoeglich}
  <div class="zusatz-wahl" style="margin-top:var(--a4)">
    <label data-begriff="zufallsverfahren-permutation" class="schalter"><input type="checkbox" checked={!!zus.zufall?.an} disabled={zufallGrund !== null} onchange={(ev) => zufallSetzen({ an: ev.currentTarget.checked })} aria-describedby="zuf-h">{L('Ohne Normalverteilung - mit Zufallsverfahren', 'No normal distribution - with random procedures')}</label>
    <p id="zuf-h" class="hilfe">{zufallGrund !== null ? zufallGrundText(zufallGrund) : verfahren?.id === 'gruppen'
      ? d('Statable mischt die Gruppenzuordnung immer wieder neu (Permutationstest mit dem Welch-t) und zieht für den Unterschied ein Bootstrap-Intervall, in jeder Gruppe getrennt. Das braucht keine Normalverteilung. Du siehst, wie oft der Zufall allein so viel ergibt.', 'Statable mischt die Gruppenzuordnung immer wieder neu (Permutationstest mit dem Welch-t) und zieht für den Unterschied ein Bootstrap-Intervall, in jeder Gruppe getrennt. Das braucht keine Normalverteilung. Sie sehen, wie oft der Zufall allein so viel ergibt.', 'Statable shuffles the group assignment again and again (permutation test with Welch t) and draws a bootstrap interval for the difference, separately within each group. This needs no normal distribution. You see how often chance alone gives this much.')
      : verfahren?.id === 'zusammenhang' ? L('Permutationstest für r (die Werte einer Spalte werden immer wieder neu zugeordnet) und Bootstrap-Intervall für r, daneben das Intervall über Fisher-z. Gilt für die Korrelation nach Pearson.', 'Permutation test for r (the values of one column are assigned anew again and again) and bootstrap interval for r, with the Fisher z interval next to it. Applies to the Pearson correlation.')
      : verfahren?.id === 'vorhersage' ? L('Fall-Bootstrap der Koeffizienten: Ganze Zeilen werden immer wieder neu gezogen und das Modell jedes Mal neu gerechnet. Das braucht weder normalverteilte Reste noch gleiche Streuung; daneben steht das klassische t-Intervall.', 'Case bootstrap of the coefficients: whole rows are drawn anew again and again and the model is recalculated each time. This needs neither normally distributed residuals nor equal spread; the classical t interval is shown next to it.')
      : L('Bootstrap-Intervall für den Mittelwert oder den Median jeder Zahlenspalte: Statable zieht immer wieder neue Stichproben aus den vorhandenen Fällen. Das braucht keine Normalverteilung.', 'Bootstrap interval for the mean or the median of each number column: Statable repeatedly draws new samples from the existing cases. This needs no normal distribution.')}
      <HilfeLink id="zufallsverfahren-permutation" text={L('Hilfe: Permutationstest und Bootstrap', 'Help: permutation test and bootstrap')} /></p>
    {#if zus.zufall?.an && zufallGrund === null}
      <fieldset class="zusatz-gruppe" style="margin-top:var(--a2)"><legend>{L('Zahl der Ziehungen und Startwert', 'Number of draws and seed')}</legend>
        <div class="eingabe"><label for="zuf-b">{L('Zahl der Ziehungen B', 'Number of draws B')}</label>
          <input id="zuf-b" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" value={zufallText.B} oninput={(ev) => zufallEingabe('B', ev.currentTarget.value)} aria-invalid={zufallBText === null || !bGueltig(zufallBText) ? 'true' : undefined} aria-describedby="zuf-b-h" style="max-width:10ch">
          <p id="zuf-b-h" class="hilfe" role={zufallBText === null || !bGueltig(zufallBText) ? 'alert' : undefined}>{zufallBText === null || !bGueltig(zufallBText) ? L('Die Zahl der Ziehungen muss eine ganze Zahl von 99 bis 99 999 sein.', 'The number of draws must be a whole number from 99 to 99,999.') : L('Voreinstellung 9999: Mit mehr Ziehungen schwanken die Grenzen weniger.', 'Default 9999: with more draws the limits fluctuate less.')}</p></div>
        <div class="eingabe"><label for="zuf-s">{L('Startwert des Zufalls', 'Seed of the random numbers')}</label>
          <input id="zuf-s" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" value={zufallText.start} oninput={(ev) => zufallEingabe('start', ev.currentTarget.value)} aria-invalid={zufallStartText === null || zufallStartText > 4294967295 ? 'true' : undefined} aria-describedby="zuf-s-h" style="max-width:14ch">
          <p id="zuf-s-h" class="hilfe">{L('Gleiche Daten und gleicher Startwert ergeben dieselben Zahlen. Ein anderer Startwert verschiebt sie ein wenig; im Ergebnis zeigt „Neu ziehen“ das.', 'The same data and the same seed give the same numbers. Another seed moves them a little; "Draw again" in the result shows this.')}</p></div>
        {#if verfahren?.id === 'gruppen' || verfahren?.id === 'verteilung'}
          <div class="segment" role="radiogroup" aria-label={L('Kennzahl', 'Statistic')} style="margin-top:var(--a2)">{#each [['mittel', L('Mittelwert', 'Mean')], ['median', L('Median', 'Median')]] as [w, tx] (w)}<label data-begriff={w === 'median' ? 'median' : 'mittelwert'}><input type="radio" name="zuf-stat" value={w} checked={(zus.zufall?.statistik ?? 'mittel') === w} onchange={() => zufallSetzen({ statistik: w as 'mittel' | 'median' })}>{tx}</label>{/each}</div>
        {/if}
        <div class="segment" role="radiogroup" aria-label={L('Art des Intervalls', 'Type of interval')} aria-describedby="zuf-art-h" style="margin-top:var(--a2)">{#each [['perzentil', L('Perzentil-Intervall (Standard)', 'Percentile interval (default)')], ['bca', L('BCa-Intervall', 'BCa interval')]] as [w, tx] (w)}<label data-begriff={w === 'bca' ? 'bca' : 'perzentilintervall'}><input type="radio" name="zuf-art" value={w} checked={(zus.zufall?.art ?? 'perzentil') === w} onchange={() => zufallSetzen({ art: w as 'perzentil' | 'bca' })}>{tx}</label>{/each}</div>
        <p id="zuf-art-h" class="hilfe">{L('Das Perzentil-Intervall nimmt die mittleren 95 % der Ziehungen. BCa korrigiert Verzerrung und Schiefe und braucht mindestens 5 Fälle; beim Median ist es unsicher.', 'The percentile interval takes the middle 95% of the draws. BCa corrects bias and skewness and needs at least 5 cases; for the median it is uncertain.')} <HilfeLink id="bootstrap-intervalle" text={L('Hilfe: Bootstrap-Intervalle', 'Help: bootstrap intervals')} /></p>
      </fieldset>
    {/if}
  </div>
{/if}
{/snippet}
{#snippet frageEditor()}
{#if verfahren}
        <p class="lueckensatz">{verfahren.satz[0]}{#each verfahren.luecken as l, i (l.schluessel)}{#if !l.weg}{#if l.davor}{' '}{l.davor}:{' '}{/if}{@render lueckeKnopf(l)}{verfahren.satz[i + 1]}{/if}{/each}</p>
        {#if verfahren.luecken.some(l => l.weg) || verfahren.id === 'gruppen' || (verfahren.id === 'praepost' && !jaNeinFall(verfahren, werte)) || verfahren.id === 'vorhersage' || verfahren.id === 'mediation' || risikoMoeglich || kreuzWegeMoeglich || zufallMoeglich}
          <details class="auf weitere-wege" open={verfahren.luecken.some(l => l.weg && (offen === l.schluessel || werte[l.schluessel].length > 0)) || zusatzAn(zus)}>
            <summary>{L('Weitere Wege', 'More options')}</summary>
            {#each verfahren.luecken.filter(l => l.weg) as l (l.schluessel)}<p class="lueckensatz kompakt" style="margin:var(--a2) 0">{l.davor}:{' '}{@render lueckeKnopf(l)}.</p>{/each}
            {@render zusatzWege()}
          </details>
        {/if}
        {#if verfahren.id === 'gruppen' && !werte.l1.length}<ZweiSpalten />{/if}
        {#if verfahren.id === 'meta'}<div style="margin-top:var(--a4)"><MetaEingabe /></div>{/if}
        {#if luecke}
          <!-- Nachttest NVDA 11.11.: je Frage ein neues fieldset ({#key}), sonst nennt NVDA nach Enter die nächste Frage („Welche Gruppen?“) nicht - es sagt eine Gruppe nur beim Betreten an. -->
          <div class="wahl klappt" transition:rutsch id="wahl">{#key luecke.schluessel}<fieldset onpointerdown={ziehStart} onkeydown={lk().wahl === 'mehrere' ? undefined : wahlTaste} onfocusout={lk().wahl === 'mehrere' ? undefined : wahlVerlassen} aria-describedby={lk().wahl === 'mehrere' ? undefined : 'wahl-tasten'}><legend>{luecke.frage}</legend>
            {#if lk().wahl !== 'mehrere'}<p class="hilfe" id="wahl-tasten">{L('Pfeiltasten: Spalte suchen. Enter oder Leertaste: übernehmen.', 'Arrow keys: find a column. Enter or Space: choose it.')}</p>{/if}
            {#snippet option(sp: Spalte)}<label class="option"><input type={lk().wahl === 'mehrere' ? 'checkbox' : 'radio'} name="wahl" value={sp.name} checked={werte[lk().schluessel].includes(sp.name)} onchange={() => (lk().wahl === 'mehrere' ? setze(lk().schluessel, sp.name, true) : wahlAendert(lk().schluessel, sp.name))}>
                <span>{#if istSetName(sp.name)}<Icon n="mehrfach" /> {/if}{lesbar(sp, true)}{' '}<small>{sp.bezeichnung && !istSetName(sp.name) ? sp.name + ' · ' : ''}{istSetName(sp.name) ? `${L('Mehrfachantworten', 'Multiple response')}, ${setZeilen(sp.name)}` : verfahren?.id === 'mehrebenen' && luecke.schluessel === 'l2' ? `${ctx.verschieden(sp.name)} ${L('verschiedene Werte', 'distinct values')}` : sp.art === 'text' || ctx.verschieden(sp.name) <= 12 ? Lp(ctx.verschieden(sp.name), `${ctx.verschieden(sp.name)} Gruppe`, `${ctx.verschieden(sp.name)} Gruppen`, `${ctx.verschieden(sp.name)} group`, `${ctx.verschieden(sp.name)} groups`) : L('Zahl', 'Number')}</small></span></label>{/snippet}
            {#if lk().wahl === 'mehrere' && !lk().hoechstens && wahlListe.length > 1}
              <div class="alle-zeile"><button class="k leise klein" type="button" onclick={() => alleWaehlen(lk().schluessel)}>{wahlListe.every(x => werte[lk().schluessel].includes(x.name)) ? L('alle abwählen', 'deselect all') : L('alle wählen', 'select all')}</button><span class="hilfe">{L('Oder mit gedrückter Maustaste über mehrere Felder ziehen.', 'Or drag over several boxes with the mouse button held down.')}</span></div>
            {:else if lk().wahl === 'mehrere' && wahlListe.length > 1}
              <p class="hilfe">{L('Mit gedrückter Maustaste über mehrere Felder ziehen.', 'Drag over several boxes with the mouse button held down.')}</p>
            {/if}
            {#if wahlGruppen}
              {#each wahlGruppen as g, gi (g.skala ? 'skala:' + g.skala : g.stamm ?? '')}<div class="optionen-gruppe" role="group" aria-labelledby="og-{gi}" style="--gf:var(--gruppe-{gi % 6 + 1})"><h4 class="optionen-titel" id="og-{gi}">{#if g.skala}{L('Skala', 'Scale')} „{g.skala}“{:else if g.stamm}{skalaStaemme.has(g.stamm) ? L('Übrige', 'Remaining') + ': ' : ''}{gruppenSpanne(g, L('bis', 'to'))}{:else}{L('Weitere Spalten', 'Other columns')}{/if}<small>{g.spalten.length}</small>{#if g.skala && lk().wahl === 'mehrere'}{@const namen = g.spalten.map(x => x.name)}<button class="k leise klein" type="button" style="margin-inline-start:var(--a2)" onclick={() => skalaWaehlen(lk().schluessel, namen)}>{namen.every(n => werte[lk().schluessel].includes(n)) ? L('alle abwählen', 'deselect all') : L('alle wählen', 'select all')}<span class="nur-vorleser"> ({g.skala})</span></button>{/if}</h4><div class="optionen">{#each g.spalten as sp (sp.name)}{@render option(sp)}{/each}</div></div>{/each}
            {:else}
            <div class="optionen">{#each wahlListe as sp (sp.name)}{@render option(sp)}
            {:else}<p>{d('In deinen Daten passt keine Spalte hierher.', 'In Ihren Daten passt keine Spalte hierher.', 'No column in your data fits here.')}{#if luecke.keine} {luecke.keine(s.spalten, ctx)}{/if} <a href="#spalten">{L('Spalten beschreiben', 'Describe columns')}</a></p>{/each}</div>
            {/if}
            {#if verfahren.id === 'uebereinstimmung' && luecke.schluessel === 'l1'}<p class="heft-text" style="margin-top:var(--a3)">{d('Kodierungen aus MAXQDA: Exportiere die Codes je Segment (oder den Intercoder-Export) als Tabelle mit einer Zeile je Einheit und einer Spalte je Kodierende und öffne sie hier.', 'Kodierungen aus MAXQDA: Exportieren Sie die Codes je Segment (oder den Intercoder-Export) als Tabelle mit einer Zeile je Einheit und einer Spalte je Kodierende und öffnen Sie sie hier.', 'Codings from MAXQDA: export the codes per segment (or the intercoder export) as a table with one row per unit and one column per coder, and open it here.')}</p>{/if}
            {#if verfahren.id === 'messwiederholung' && luecke.schluessel === 'l1'}
              {#if werte.l1.length}<p class="heft-text" style="margin-top:var(--a3)"><b>{L('Reihenfolge', 'Order')}{dp()}</b> {werte.l1.map(n => name(n)).join(' ' + pfeil() + ' ')}. {d('Statable nimmt die Spalten in der Reihenfolge, in der du sie anklickst.', 'Statable nimmt die Spalten in der Reihenfolge, in der Sie sie anklicken.', 'Statable takes the columns in the order in which you click them.')}</p>{/if}
              {#if langHinweis}<p class="heft-text" style="margin-top:var(--a3)">{L('Liegen die Messungen untereinander statt nebeneinander (eine Zeile je Messung)? Dann braucht Statable erst eine Spalte je Zeitpunkt:', 'Are the measurements stacked in rows instead of side by side (one row per measurement)? Then Statable first needs one column per time point:')} <a href="#umformen">{L('Daten von lang nach breit umformen', 'Reshape data from long to wide')}</a></p>{/if}
            {/if}
            {#if lk().mindestens === 0}<div class="knopfzeile" style="margin-top:var(--a3)"><button class="k" type="button" onclick={() => { const k = lk().schluessel; werte[k] = []; uebersprungen = [...uebersprungen, k]; offen = verfahren!.luecken.find(x => x.schluessel !== k && !werte[x.schluessel].length && !uebersprungen.includes(x.schluessel))?.schluessel ?? null; tick().then(() => (offen ? document.querySelector<HTMLElement>('#wahl input') : document.getElementById('f2-t'))?.focus()); }}>{lk().ohne ?? L('Ohne Gruppen weiter', 'Continue without groups')}</button></div>{/if}
            {#if lk().wahl === 'mehrere'}<div class="knopfzeile" style="margin-top:var(--a3)"><button class="k haupt" type="button" aria-disabled={werte[lk().schluessel].length < (lk().mindestens ?? 1) ? 'true' : undefined} onclick={() => { if (werte[lk().schluessel].length >= (lk().mindestens ?? 1)) { const n = verfahren!.luecken.find(x => x.schluessel !== lk().schluessel && !werte[x.schluessel].length && !uebersprungen.includes(x.schluessel) && (x.mindestens !== 0 || (!x.still && s.spalten.some(sp => x.passt(sp, ctx))))); offen = n?.schluessel ?? null; tick().then(() => (offen ? document.querySelector<HTMLElement>('#wahl input') : document.getElementById('f2-t'))?.focus()); } }}>{L(`Fertig (${werte[lk().schluessel].length} gewählt)`, `Done (${werte[lk().schluessel].length} selected)`)}</button></div>{/if}
          </fieldset>{/key}</div>
        {/if}
{/if}
{/snippet}
{#snippet pruefBlock()}
{#if verfahren}
        <div class="vorschlag"><Icon n="haken" k="ok" /><div><b>{verfahren.titel.replace('?', '')} ({verfahren.zusatz})</b> <HilfeLink id={verfahren.id === 'vorhersage' && vorhArt ? (vorhArt === 'quantil' ? 'quantilregression' : 'strafregression') : verfahren.id === 'vorhersage' && katArt ? katHilfeId(katArt)! : `frage-${verfahren.id}`} text={verfahren.id === 'vorhersage' && (katArt || vorhArt) ? L('Hilfe zu diesem Verfahren', 'Help on this method') : L('Hilfe zu dieser Frageart', 'Help on this type of question')} /><span style="color:var(--tinte-2)">{L('Fachbegriff', 'Technical term')}: {verfahren.id === 'vorhersage' && vorhArt ? (vorhArt === 'quantil' ? quantilFachwort() : strafFachwort(vorhEff.alpha)) : verfahren.id === 'vorhersage' && katArt ? katFachwort(katArt, { referenz: modellEffWahl.referenz, zaehl: modellEffWahl.zaehl }) : verfahren.fachwort(werte, ctx)}</span>
          <p style="margin-top:var(--a2)">{verfahren.id === 'vorhersage' && katArt ? katWarum(katArt) : verfahren.warum(werte, ctx)}</p></div></div>
        {#if verfahren.id === 'uebereinstimmung' && werte.l1.length >= 2 && werte.l1.every(n => ctx.istZahl(n))}
          <div class="korr-wahl" role="radiogroup" aria-labelledby="ueb-t" style="margin-top:var(--a4)">
            <h3 id="ueb-t" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Was bedeuten die Zahlen?', 'What do the numbers mean?')}</h3>
            <div class="segment">{#each [['kappa', L('Stufen oder Noten (Kappa)', 'Levels or grades (kappa)')], ['icc', L('Punktwerte (ICC)', 'Point scores (ICC)')]] as [w, tx]}<label data-begriff={w === 'icc' ? 'icc' : 'kappa'}><input type="radio" name="ueb-art" value={w} checked={(uebereinstimmungsArt(werte.l1, ctx, uebWunsch ?? undefined).art === 'inter' ? 'kappa' : uebereinstimmungsArt(werte.l1, ctx, uebWunsch ?? undefined).art) === w} onchange={() => (uebWunsch = w as 'kappa' | 'icc')}>{tx}</label>{/each}</div>
            <p style="color:var(--tinte-2);margin-top:var(--a2)">{L('Stufen oder Noten: Übereinstimmung der Kategorien (Kappa, Krippendorffs Alpha). Punktwerte: Übereinstimmung der Höhe (ICC).', 'Levels or grades: agreement of the categories (kappa, Krippendorff\'s alpha). Point scores: agreement of the size (ICC).')}</p>
          </div>
        {/if}
        {#if verfahren.id === 'faktor' && werte.l1.length >= 3}
          {@const info = erg?.typ === 'faktor' ? erg.e : null}
          <div class="korr-wahl fa-wahl" style="margin-top:var(--a4)">
            <div role="radiogroup" aria-labelledby="fa-m-t">
              <h3 id="fa-m-t" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Methode', 'Method')}</h3>
              <div class="segment">
                <label data-begriff="hauptkomponenten"><input type="radio" name="fa-methode" value="pc" checked={faWahl.methode === 'pc'} onchange={() => (faWahl = { ...faWahl, methode: 'pc' })}>{L('Hauptkomponenten, Varimax (Standard)', 'Principal components, varimax (default)')}</label>
                <label data-begriff="promax"><input type="radio" name="fa-methode" value="paf" checked={faWahl.methode === 'paf'} onchange={() => (faWahl = { ...faWahl, methode: 'paf' })}>{L('Hauptachsen, Promax (für korrelierte Merkmale)', 'Principal axes, promax (for correlated traits)')}</label>
              </div>
            </div>
            <div class="eingabe" style="margin-top:var(--a3);max-width:460px"><label for="fa-zahl">{faWahl.methode === 'paf' ? L('Zahl der Faktoren', 'Number of factors') : L('Zahl der Komponenten', 'Number of components')}</label>
              <select id="fa-zahl" value={String(faWahl.zahl ?? 0)} onchange={(ev) => { const z = Number((ev.currentTarget as HTMLSelectElement).value); faWahl = { ...faWahl, zahl: z > 0 ? z : null }; }}>
                <option data-begriff="kaiser-kriterium" value="0">{L('nach Kaiser-Kriterium (Eigenwert über 1, Standard)', 'by the Kaiser criterion (eigenvalue above 1, default)')}{info?.kaiser !== undefined ? ` · ${info.kaiser}` : ''}</option>
                {#each Array.from({ length: Math.min(werte.l1.length - 1, 12) }, (_, i) => i + 1) as k}<option value={String(k)}>{k}{info?.parallel === k ? L(' · Vorschlag der Parallelanalyse', ' · suggested by parallel analysis') : ''}{info?.kaiser === k ? L(' · Kaiser-Kriterium', ' · Kaiser criterion') : ''}</option>{/each}
              </select></div>
            <div class="eingabe" style="margin-top:var(--a3);max-width:460px"><label for="fa-grenze">{L('Kleine Ladungen ausblenden', 'Hide small loadings')}</label>
              <select data-begriff="ladung" id="fa-grenze" value={String(faWahl.grenze ?? 0)} onchange={(ev) => { const z = Number((ev.currentTarget as HTMLSelectElement).value); faWahl = { ...faWahl, grenze: z > 0 ? z : null }; }}>
                <option value="0">{L('keine, alle zeigen', 'none, show all')}</option>
                <option value="0.1">{L('unter ,10', 'below .10')}</option>
                <option value="0.2">{L('unter ,20', 'below .20')}</option>
                <option value="0.3">{L('unter ,30 (Standard)', 'below .30 (default)')}</option>
                <option value="0.4">{L('unter ,40', 'below .40')}</option>
                <option value="0.5">{L('unter ,50', 'below .50')}</option>
              </select></div>
            {#if info?.parallel !== undefined && info.parallel !== info.faktoren.length && info.parallel >= 1}
              <p style="margin-top:var(--a2)"><button class="k klein" type="button" onclick={() => (faWahl = { ...faWahl, zahl: info.parallel! })}>{faWahl.methode === 'paf' ? L(`Mit ${info.parallel} Faktoren rechnen (Parallelanalyse)`, `Calculate with ${info.parallel} factors (parallel analysis)`) : L(`Mit ${info.parallel} Komponenten rechnen (Parallelanalyse)`, `Calculate with ${info.parallel} components (parallel analysis)`)}</button></p>
            {/if}
            <p style="color:var(--tinte-2);margin-top:var(--a2)">{L('Hauptkomponenten fassen die Unterschiede aller Fragen zusammen (wie in SPSS voreingestellt). Für die Frage, welche gemeinsamen Merkmale hinter den Fragen stehen, ist die Hauptachsen-Faktorenanalyse gedacht; Promax lässt diese Merkmale zusammenhängen, wie es in der Bildungsforschung meist der Fall ist. Die Zahl schlägt am besten die Parallelanalyse vor; das Kaiser-Kriterium nennt oft zu viele.', 'Principal components summarize the differences of all questions (the SPSS default). For the question which common traits lie behind the questions, principal axis factoring is meant; promax allows these traits to be correlated, as is usually the case in educational research. The number is best suggested by parallel analysis; the Kaiser criterion often gives too many.')}</p>
          </div>
        {/if}
        <ul class="pruefliste">{#each pruefliste as p, pi}
          <li id={p.art === 'sperre' && pruefliste.findIndex(x => x.art === 'sperre') === pi ? 'pruef-sperre' : undefined}><Icon n={p.art === 'ok' ? 'haken' : p.art === 'info' ? 'info' : 'hinweis'} k={p.art === 'ok' ? 'ok' : p.art === 'info' ? '' : 'hw'} /><span>{#if p.art === 'sperre'}<b>{p.text}</b>{:else}{p.text}{/if}{#if p.klein}<small>{p.klein}{#if p.erklaer}{' '}<button class="begriff" type="button" onclick={() => (randKey = p.erklaer!)}>{L('Was heißt das?', 'What does that mean?')}</button>{/if}</small>{/if}
            {#if p.gewicht}<button class="k" type="button" style="margin-top:6px" onclick={() => oeffneGewichtDialog()}>{p.knopf}</button>{/if}
            {#if p.fund}<button class="k" type="button" data-klaeren style="margin-top:6px" onclick={() => klaere(p.fund!)}>{p.knopf}</button>{/if}
            {#if p.modell}<RStart knopf={p.knopf!} los={() => vorschlagRechnen(p.modell!)} laeuft={wartet || rechnet} gesperrt={sperreDa} haupt={false} pakete={p.modell === 'ordinal' ? R_PAKETE_ORD : R_PAKETE_ZAEHL} mitKosten />{/if}
            {#if p.ebenen}<button class="k" type="button" style="margin-top:6px" data-tipp={L('Öffnet die Frage mit denselben Spalten als Mehrebenenmodell, das die Gruppen berücksichtigt', 'Opens the question with the same columns as a multilevel model that takes the groups into account')} onclick={() => ebenenOeffnen(p.ebenen!)}>{p.knopf}</button>{/if}</span></li>
        {/each}</ul>
        {#if gesperrt && verfahren.id === 'messwiederholung' && werte.l1.length >= 4 && !alleJaNein(werte.l1, ctx)}<MwZweiBlock spalten={werte.l1} gruppenSpalte={werte.l2[0]} {name} />{/if}
        {#if (verfahren.id === 'verteilung' || verfahren.id === 'kreuz') && werte.l1.some(istSetName)}
          <div class="korr-wahl" style="margin-top:var(--a4)">
            <label class="schalter"><input type="checkbox" bind:checked={mfMitNull}>{L('Fälle ohne Ankreuzung mitzählen', 'Include cases without a check')}</label>
            <p style="color:var(--tinte-2);margin-top:var(--a2)">{d('Aus: Gültig sind Fälle mit mindestens einer Ankreuzung (wie in SPSS). An: Auch wer nichts angekreuzt, aber die Frage beantwortet hat, zählt mit. Du kannst das im Ergebnis noch umschalten.', 'Aus: Gültig sind Fälle mit mindestens einer Ankreuzung (wie in SPSS). An: Auch wer nichts angekreuzt, aber die Frage beantwortet hat, zählt mit. Sie können das im Ergebnis noch umschalten.', 'Off: valid cases are those with at least one check (as in SPSS). On: anyone who checked nothing but answered the question is included. You can still switch this in the result.')}</p>
          </div>
        {/if}
        {#if verfahren.id === 'kaplanmeier' && kmVorschau?.einWert}
          <p style="color:var(--tinte-2);margin-top:var(--a4)">{kmEinWertText(kmVorschau)}</p>
        {:else if verfahren.id === 'kaplanmeier' && kmVorschau}
          <div class="korr-wahl" role="radiogroup" aria-labelledby="km-vor-t" style="margin-top:var(--a4)">
            <h3 id="km-vor-t" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Bei welchem Wert ist das Ereignis eingetreten?', 'For which value did the event occur?')}</h3>
            <div class="segment">{#each kmVorschau.werte as tx, i}<label><input type="radio" name="km-vor-ereignis" value={i} checked={kmVorschau.ereignisIndex === i} onchange={() => (kmWahl = i as 0 | 1)}>{tx}</label>{/each}</div>
            <p style="color:var(--tinte-2);margin-top:var(--a2)">{kmVorschlagText(kmVorschau, true)} {L(`Der andere Wert („${zensurWort(kmVorschau)}“) gilt als zensiert: Die Beobachtung endete, ohne dass das Ereignis eingetreten ist.`, `The other value ("${zensurWort(kmVorschau)}") counts as censored: the observation ended without the event.`)}</p>
          </div>
        {/if}
{/if}
{/snippet}
{#snippet rechnenZeile()}
  {#if verfahren}
    {#if id === 'neu'}
      <div class="knopfzeile" style="margin-top:var(--a5)">
        {#if !vonSelbst}
          {#if rKnopf}<div style="flex-basis:100%"><RStart knopf={L('Rechnen', 'Calculate')} los={rechnen} laeuft={rechnet} gesperrt={sperreDa} gross pakete={rPakete} mitKosten={coxAn || clusterAn || umfrageAn || designBAn || vorhArt !== null || kpKarte === 'diskriminanz'} /></div>
          {:else}<button class="k haupt gross" type="button" onclick={rechnen} aria-disabled={rechnet || pruefliste.some(p => p.art === 'sperre' && !!p.fund) ? 'true' : undefined} aria-describedby="rechnen-t">{#if rechnet}<Rechnet imKnopf text={verfahren.id === 'mediation' && fortschritt > 0 ? L(`Statable rechnet … Bootstrap ${Math.round(fortschritt * 100)} %`, `Statable is calculating … bootstrap ${Math.round(fortschritt * 100)}%`) : L('Statable rechnet …', 'Statable is calculating …')} />{:else}{L('Rechnen', 'Calculate')}{/if}</button>{#if rechnet && verfahren.id === 'mediation' && prozessModell !== 4 && werte.l4[0]}<button class="k" type="button" onclick={() => (prozessAbbruch = true)}>{L('Abbrechen', 'Cancel')}</button>{:else}<Abbrechen aktiv={rechnet} />{/if}{/if}
        {/if}
        {#if eigenNotiz(verfahren.id)}<p class="heft-text" style="flex-basis:100%">{eigenNotiz(verfahren.id)}</p>{:else}<details class="auf" style="border:0;flex-basis:100%" open={s.einst.profi}><summary>{L('Befehl ansehen', 'View command')}</summary><pre class="befehl">{syntax}</pre></details>{/if}
      </div>
    {:else if geaendert && !vonSelbst}
      <div class="knopfzeile" style="margin-top:var(--a4)">
        {#if rKnopf}<div style="flex-basis:100%"><RStart knopf={L('Neu rechnen', 'Recalculate')} los={neuRechnen} laeuft={wartet} gesperrt={sperreDa} gross pakete={rPakete} mitKosten={coxAn || clusterAn || umfrageAn || designBAn || vorhArt !== null || kpKarte === 'diskriminanz'} /></div>
        {:else}<button class="k haupt" type="button" onclick={neuRechnen} aria-disabled={sperreDa ? 'true' : undefined}>{#if wartet}<Rechnet imKnopf text={L('Statable rechnet …', 'Statable is calculating …')} />{:else}{L('Neu rechnen', 'Recalculate')}{/if}</button><Abbrechen aktiv={wartet} />{/if}
      </div>
    {/if}
    {#if mebFehler}<p id="meb-fehler" class="heft-text" role="alert" tabindex="-1" style="color:var(--fehler, #b3261e)">{mebFehler}</p>{/if}
    {#if id === 'neu'}<p id="rechnen-t" style="color:var(--tinte-2)">{pruefliste.some(p => p.art === 'sperre' && !!p.fund) ? L('Erst diese eine Sache klären - dann stimmt das Ergebnis.', 'Clear up this one thing first - then the result will be right.') : pruefliste.some(p => p.art === 'sperre') ? L('So rechnet Statable noch nicht - erst den fett gedruckten Punkt oben klären.', 'Statable cannot calculate this yet - first clear up the point in bold above.') : vonSelbst ? (wartet ? (verfahren.id === 'mediation' && fortschritt > 0 ? L(`Statable rechnet … Bootstrap ${Math.round(fortschritt * 100)} %`, `Statable is calculating … bootstrap ${Math.round(fortschritt * 100)}%`) : L('Statable rechnet …', 'Statable is calculating …')) : L('Das Ergebnis erscheint von selbst, sobald alles gewählt ist.', 'The result appears by itself as soon as everything is chosen.')) : L('Auswahl fertig? Dann „Rechnen“.', 'Done choosing? Then “Calculate”.')}</p>{/if}
  {/if}
{/snippet}

{#if nurRechnen}<span hidden></span>
{:else if id === 'neu'}
<div class="tisch"><article class="blatt" aria-labelledby="blatt-t">
  <div class="blatt-kopf"><h1 id="blatt-t">{L('Neue Auswertung', 'New analysis')}</h1></div>

  <section use:weich class="feld" aria-label={L('Schritt 1', 'Step 1')}><span class="nr {fertigGewaehlt ? 'fertig' : ''}" aria-hidden="true">{#if fertigGewaehlt}<Icon n="haken" />{:else}1{/if}</span>
    <div><h2 id="f1-t" tabindex="-1">{d('Deine Frage', 'Ihre Frage', 'Your question')} {#if !verfahren}<HilfeLink id="blatt-seite" text={L('Hilfe: eine Auswertung starten', 'Help: asking a question')} />{/if}</h2><div class="feld-inhalt">
      {#if !verfahren}
        <p class="heft-text" style="margin-bottom:var(--a4)">{d('Was möchtest du herausfinden? Den Fachbegriff nennt Statable dazu.', 'Was möchten Sie herausfinden? Den Fachbegriff nennt Statable dazu.', 'What would you like to find out? Statable adds the technical term.')}</p>
        {#snippet kartenreihe(ids: string[], kg: string)}<div class="kacheln" role="group" aria-labelledby="kg-{kg}">{#each ids.map(i => VERFAHREN.find(v => v.id === i)!) as v (v.id)}<button type="button" class="kachel" data-karte={v.id} onclick={() => waehleArt(v)} onpointerenter={() => (kartenBlick = v.id)} onfocus={() => (kartenBlick = v.id)}><Icon n={v.icon} /><b>{v.titel}</b>{#if v.zusatz}<em class="kachel-zusatz">{v.zusatz}</em>{/if}<span>{v.beispiel}</span></button>{/each}</div>{/snippet}
        <div class="eingabe karten-suche"><label class="nur-vorleser" for="karten-suche">{L('In den Verfahren suchen', 'Search in the methods')}</label>
          <div class="suchfeld"><Icon n="suche" /><input id="karten-suche" type="search" autocomplete="off" spellcheck="false" enterkeyhint="search" placeholder={L('In den Verfahren suchen, z. B. „Mediation“', 'Search in the methods, e.g. "mediation"')} bind:value={kartenText} aria-describedby="karten-suche-h"></div>
          <p id="karten-suche-h" class="hilfe">{d('Die Suche findet alle Verfahren, auch die für dein Fachgebiet ausgeblendeten.', 'Die Suche findet alle Verfahren, auch die für Ihr Fachgebiet ausgeblendeten.', 'The search finds all methods, including those hidden for your field of study.')}</p></div>
        <div class="knopfzeile ordnung" role="group" aria-label={L('Karten ordnen', 'Order the cards')} style="margin:var(--a3) 0">
          <button class="k klein" type="button" aria-pressed={s.einst.ordnung !== 'kurs'} onclick={() => ordnungSetzen('frage')}>{L('Nach Fragen', 'By question')}</button>
          <button class="k klein" type="button" aria-pressed={s.einst.ordnung === 'kurs'} onclick={() => ordnungSetzen('kurs')}>{L('Wie im Kurs', 'Like in class')}</button>
        </div>
        {#if kartenText.trim()}
          <div use:ergebnisAnsage={{ satz: 'p.heft-text', ms: KARTENSUCHE_RUHE_MS }}>
            {#if qualitaetTreffer.length}<div class="kacheln" role="group" aria-label={L('Qualität und Prozess', 'Quality and process')}>{#each qualitaetTreffer as q (q.id)}<button type="button" class="kachel" data-qualitaet={q.id} onclick={() => { kartenText = ''; waehleArt(VERFAHREN.find(x => x.id === q.karte)!, q.ziel); }}><Icon n={VERFAHREN.find(x => x.id === q.karte)!.icon} /><b>{q.titel}</b><em class="kachel-zusatz">{q.zusatz}</em><span>{q.beispiel}</span></button>{/each}</div>{/if}
            {#if kartenTreffer.length}
              <p class="heft-text" style="margin:var(--a3) 0">{Lp(kartenTreffer.length, `${kartenTreffer.length} Karte gefunden.`, `${kartenTreffer.length} Karten gefunden.`, `${kartenTreffer.length} card found.`, `${kartenTreffer.length} cards found.`)}</p>
              <div class="kacheln" role="group" aria-label={L('Gefundene Karten', 'Cards found')}>{#each kartenTreffer.map(t => ({ v: VERFAHREN.find(x => x.id === t.id)!, z: t.zustand })) as { v, z } (v.id)}<button type="button" class="kachel" onclick={() => { kartenText = ''; waehleArt(v); }} onpointerenter={() => (kartenBlick = v.id)} onfocus={() => (kartenBlick = v.id)}><Icon n={v.icon} /><b>{v.titel}</b>{#if v.zusatz}<em class="kachel-zusatz">{v.zusatz}</em>{/if}<span>{v.beispiel}</span>{#if z === 'nein'}<small class="kachel-hinweis">{L(`Ausgeblendet für ${fachName(s.einst.fach)}`, `Hidden for ${fachName(s.einst.fach)}`)}</small>{/if}</button>{/each}</div>
            {:else if !qualitaetTreffer.length}<p class="heft-text" style="margin:var(--a3) 0">{L('Dazu gibt es keine Karte. Die Suche in der Hilfe findet mehr.', 'There is no card for that. The search in the help finds more.')} <a href="#hilfe">{L('Zur Hilfe', 'To the help')}</a></p>{/if}
          </div>
        {:else if s.einst.ordnung === 'kurs'}
        <p class="heft-text" style="margin-bottom:var(--a3)">{L('Hypothesentests geordnet wie in Statistikkursen: nach der Zahl der Stichproben und danach, ob es um einen Anteil, einen Mittelwert oder eine Varianz geht. Ein Klick öffnet die passende Karte; der Test steht dann im Ergebnis.', 'Hypothesis tests ordered as in statistics courses: by the number of samples and by whether it is about a proportion, a mean or a variance. A click opens the matching card; the test is then in the result.')}</p>
        <div style="overflow-x:auto"><table class="kurs-ordnung"><colgroup><col class="kopf"><col><col><col></colgroup>
          <thead><tr><td></td><th scope="col">{L('Anteil', 'Proportion')}</th><th scope="col">{L('Mittelwert', 'Mean')}</th><th scope="col">{L('Varianz', 'Variance')}</th></tr></thead>
          <tbody>{#each KURS_ZEILEN as z (z.id)}<tr><th scope="row">{z.titel}</th>{#each z.felder as f, i (i)}<td data-spalte={[L('Anteil', 'Proportion'), L('Mittelwert', 'Mean'), L('Varianz', 'Variance')][i]}>{#if f}{@const v = VERFAHREN.find(x => x.id === f.karte)!}<button type="button" class="kurs-feld" data-karte={v.id} onclick={() => waehleArt(v, f.ziel ?? null)}><b>{f.test}</b><span>{L('Karte', 'Card')}: {v.titel}</span></button>{:else}<span class="kurs-leer">{L('in Statable nicht als Test', 'not a test in Statable')}</span>{/if}</td>{/each}</tr>{/each}</tbody>
        </table></div>
        {:else}
        <div class="kachel-gruppen" use:spaltenZaehlen>
        {#each gruppenAnzeige as gr (gr.id)}
          <div class="kachel-block" class:ganz={gr.zu} style="--spann:{Math.min(gr.ids.length, kachelSpalten)}">
          {#if gr.zu}
            <details class="kachel-mehr"><summary class="kachel-gruppe" id="kg-{gr.id}">{gr.titel}</summary>{@render kartenreihe(gr.ids, gr.id)}</details>
          {:else}
            <h3 class="kachel-gruppe" id="kg-{gr.id}">{gr.titel}</h3>
            {@render kartenreihe(gr.ids, gr.id)}
          {/if}
          </div>
        {/each}
        </div>
        <div class="kachel-block ganz"><details class="kachel-mehr" open={s.einst.fach === 'technik'}><summary class="kachel-gruppe" id="kg-qualitaet">{L('Qualität und Prozess', 'Quality and process')}</summary>
          <div class="kacheln" role="group" aria-labelledby="kg-qualitaet">{#each QUALITAET as q (q.id)}<button type="button" class="kachel" data-karte={q.karte} data-qualitaet={q.id} onclick={() => waehleArt(VERFAHREN.find(x => x.id === q.karte)!, q.ziel)}><Icon n={VERFAHREN.find(x => x.id === q.karte)!.icon} /><b>{q.titel}</b><em class="kachel-zusatz">{q.zusatz}</em><span>{q.beispiel}</span></button>{/each}</div></details></div>
        {#if versteckt.length}
          <p class="fach-zeile">{Lp(versteckt.length, `${versteckt.length} Verfahren ist für das gewählte Fachgebiet ausgeblendet.`, `${versteckt.length} Verfahren sind für das gewählte Fachgebiet ausgeblendet.`, `${versteckt.length} method is hidden for the chosen field of study.`, `${versteckt.length} methods are hidden for the chosen field of study.`)}
            <button class="k leise klein" type="button" aria-expanded={versteckteZeigen} onclick={() => (versteckteZeigen = !versteckteZeigen)}>{versteckteZeigen ? L('Wieder ausblenden', 'Hide again') : L('Alle anzeigen', 'Show all')}</button>
            <a class="k leise klein" href="#einstellungen" style="text-decoration:none">{L('Fachgebiet ändern', 'Change field of study')}</a></p>
          {#if versteckteZeigen}
            <div class="kachel-block ganz"><h3 class="kachel-gruppe" id="kg-versteckt">{L(`Ausgeblendet für ${fachName(s.einst.fach)}`, `Hidden for ${fachName(s.einst.fach)}`)}</h3>{@render kartenreihe(versteckt, 'versteckt')}</div>
          {/if}
        {/if}
        {/if}
        <div class="kacheln" style="margin-top:var(--a5)"><a class="kachel leise" href="#planen" style="text-decoration:none"><Icon n="gruppen" /><b>{L('Studie planen (Poweranalyse)', 'Plan a study (power analysis)')}</b><span>{L('Wie viele Personen braucht die Studie?', 'How many people does the study need?')}</span></a><a class="kachel leise" href="#tabelle" style="text-decoration:none"><Icon n="tabelle" /><b>{L('Tabelle zusammenstellen', 'Assemble a table')}</b><span>{L('Welche Tabelle brauche ich für meine Arbeit? (SPSS: Benutzerdefinierte Tabellen)', 'Which table do I need for my paper? (SPSS: Custom Tables)')}</span></a><a class="kachel leise" href="#amtlich" style="text-decoration:none"><Icon n="tabelle" /><b>{L('Tabelle für die Veröffentlichung', 'Table for publication')}</b><span>{L('Hochgerechnet, mit Standardfehler, Geheimhaltung und Zeichenerklärung', 'Estimated, with standard errors, confidentiality and key')}</span></a><a class="kachel leise" href="#karte" style="text-decoration:none"><Icon n="karte" /><b>{L('Karte der Gebiete (Flächenkarte)', 'Map of areas (choropleth map)')}</b><span>{L('Eine Zahl je Land oder Region auf der Karte zeigen', 'Show one number per country or region on a map')}</span></a><a class="kachel leise" href="#befehle" style="text-decoration:none"><Icon n="befehl" /><b>{L('Ich habe Befehle (Syntax) aus dem Kurs', 'I have commands (syntax) from my course')}</b><span>{L('.sps-Datei öffnen oder einfügen und ausführen', 'Open or paste an .sps file and run it')}</span></a></div>
      {:else}
        {@render frageEditor()}
        <p style="margin-top:var(--a3)"><button class="k leise" type="button" onclick={() => (verfahren = null)}><Icon n="rueck" />{L('Andere Art von Frage', 'Another kind of question')}</button></p>
      {/if}
    </div></div></section>

  <section use:weich class="feld" class:zu={!fertigGewaehlt} aria-label={L('Schritt 2', 'Step 2')}><span class="nr {fertigGewaehlt ? '' : 'zu'}" aria-hidden="true">2</span>
    <div><h2 id="f2-t" tabindex="-1">{d('Passt das zu deinen Daten?', 'Passt das zu Ihren Daten?', 'Does this fit your data?')}{#if !fertigGewaehlt}<span class="nur-vorleser"> - {L('kommt danach', 'comes next')}</span>{/if}</h2><div class="feld-inhalt">
      {#if verfahren && fertigGewaehlt}
        {@render pruefBlock()}
        {@render rechnenZeile()}
      {/if}
    </div></div></section>
  <section use:weich class="feld zu" aria-label={L('Schritt 3', 'Step 3')}><span class="nr zu" aria-hidden="true">3</span><div><h2 id="f3-t">{L('Ergebnis', 'Result')}<span class="nur-vorleser"> - {L('kommt danach', 'comes next')}</span></h2></div></section>
  <section use:weich class="feld zu" aria-label={L('Schritt 4', 'Step 4')}><span class="nr zu" aria-hidden="true">4</span><div><h2 id="f4-t">{d('Für deine Arbeit', 'Für Ihre Arbeit', 'For your paper')}<span class="nur-vorleser"> - {L('kommt danach', 'comes next')}</span></h2></div></section>
</article><Rand bind:schluessel={randKey} {extra} kontext={randKontext} /></div>

{:else if blatt && blatt.art === 'kategorien'}
<KategorienBlatt {blatt} />

{:else if blatt && blatt.art === 'tabelle'}
<TabelleBlatt {blatt} />

{:else if blatt && blatt.art === 'amtlich'}
<AmtlichBlatt {blatt} />

{:else if blatt}
<div class="tisch"><article class="blatt" aria-labelledby="blatt-t">
  <div class="blatt-kopf"><h1 id="blatt-t">{blatt.titel}</h1>
    <label class="schalter"><input type="checkbox" bind:checked={blatt.imBericht} onchange={() => { sichern(); melde(blatt.imBericht ? L('Im Bericht.', 'In the report.') : L('Nicht mehr im Bericht. Das Blatt bleibt im Heft.', 'No longer in the report. The page stays in your notebook.')); }}>{L('Im Bericht', 'In report')}</label></div>

  <section use:weich class="feld" aria-label={L('Schritt 1', 'Step 1')}><span class="nr fertig" aria-hidden="true"><Icon n="haken" /></span><div><h2 id="f1-t" tabindex="-1">{d('Deine Frage', 'Ihre Frage', 'Your question')}</h2><div class="feld-inhalt">
    {#if vf}<p class="lueckensatz kompakt">{vf.satz[0]}{#each vf.luecken as l, i}{#if !l.stumm || gewaehlt[l.schluessel].length}{#if l.davor}{' '}{l.davor}:{' '}{/if}<u>{gewaehlt[l.schluessel].length > 4 ? Lp(gewaehlt[l.schluessel].length, `${gewaehlt[l.schluessel].length} Spalte`, `${gewaehlt[l.schluessel].length} Spalten`, `${gewaehlt[l.schluessel].length} column`, `${gewaehlt[l.schluessel].length} columns`) : gewaehlt[l.schluessel].length ? aufzaehlung(gewaehlt[l.schluessel].map(n => name(n))) : L('keine', 'none')}</u>{vf.satz[i + 1]}{/if}{/each}</p>
      {#each vf.luecken as l (l.schluessel)}{#if gewaehlt[l.schluessel].length > 4}<details class="auf spalten-liste"><summary>{l.davor || L('Spalten', 'Columns')} ({gewaehlt[l.schluessel].length})</summary><ul>{#each gewaehlt[l.schluessel] as n (n)}<li>{name(n)}</li>{/each}</ul></details>{/if}{/each}
      <p style="color:var(--tinte-2);margin-top:var(--a2)">{#if !blatt.gesperrt}{L('Gerechnet', 'Calculated')}: {erg?.typ === 'gewichtet' ? (erg.e.designB ? L('Umfragegewicht, Standardfehler und Tests designbasiert (survey)', 'survey weight, standard errors and tests design-based (survey)') : erg.e.design ? L('gewichtete Zahlen mit Standardfehlern, Intervallen und Tests (designbasiert, Umfragegewicht)', 'weighted numbers with standard errors, intervals and tests (design-based, survey weight)') : L('beschreibende Statistik mit Umfragegewicht (ohne Tests)', 'descriptive statistics with a survey weight (no tests)')) : erg?.typ === 'hierreg' ? (erg.e.bloecke.length === 3 ? L('hierarchische Regression (3 Blöcke)', 'hierarchical regression (3 blocks)') : L('hierarchische Regression (2 Blöcke)', 'hierarchical regression (2 blocks)')) : erg?.typ === 'quantil' ? quantilGerechnetBlatt(erg.e) : erg?.typ === 'penal' ? strafGerechnetBlatt(erg.e) : erg?.typ === 'ordreg' || erg?.typ === 'multreg' || erg?.typ === 'zaehlreg' ? gerechnetText(erg.e) : erg?.typ === 'zusammenhang' ? korrName(erg.e.methode, !!erg.e.kontroll?.length) : erg?.typ === 'korrmatrix' ? korrMatrixName(erg.e) : erg?.typ === 'kappa' ? L(`Cohens Kappa (${gewichtName(erg.e.gewicht)})`, `Cohen's kappa (${gewichtName(erg.e.gewicht)})`) + (erg.e.inter ? L(' und Krippendorffs Alpha', " and Krippendorff's alpha") : '') : erg?.typ === 'icc' ? (erg.e.modell === 'absolut' ? L('Intraklassen-Korrelation (ICC), absolute Übereinstimmung', 'intraclass correlation (ICC), absolute agreement') : L('Intraklassen-Korrelation (ICC), Konsistenz', 'intraclass correlation (ICC), consistency')) : erg?.typ === 'mcnemar' ? L('McNemar-Test (exakt)', 'McNemar test (exact)') : erg?.typ === 'cochran' ? L('Cochran-Q-Test mit Paarvergleichen (McNemar, Holm)', "Cochran's Q test with pairwise comparisons (McNemar, Holm)") : erg?.typ === 'mediation' ? bootstrapKurz(erg.e) : erg?.typ === 'zeitreihen' ? zeitreiheGerechnetBlatt(erg.e) : erg?.typ === 'cluster' ? clusterGerechnetBlatt(erg.e) : erg?.typ === 'diskriminanz' ? diskrGerechnet(erg.e) : erg?.typ === 'loglinear' ? logGerechnet(erg.e, name) : erg?.typ === 'manova' ? manovaGerechnet() : erg?.typ === 'armut' ? armutGerechnet() : erg?.typ === 'probit' ? probitGerechnet() : erg?.typ === 'wls' ? wlsGerechnet() : erg?.typ === 'nls' ? nlsGerechnet() : rangBlatt ? rangTestName(rangBlatt) : vf.fachwort(gewaehlt, ctx)}{' · '}{#if blatt.gewicht}{gewichtSatz(blatt.gewicht, blatt.gewicht.summe, blatt.gewicht.zeilen)}{' · '}{/if}{/if}<a href="#blatt/neu">{L('Neue Auswertung starten', 'Start a new analysis')}</a></p>{/if}
    {#if editorDa && verfahren}
      <details class="auf frage-aendern"><summary>{L('Spalten und Optionen ändern', 'Change columns and options')}</summary>
        <p class="heft-text" style="margin:var(--a2) 0">{s.einst.sofort ? L('Das Ergebnis rechnet sich bei jeder Änderung von selbst neu.', 'The result recalculates by itself with every change.') : d('Ändere die Auswahl und rechne danach neu.', 'Ändern Sie die Auswahl und rechnen Sie danach neu.', 'Change the selection, then recalculate.')}</p>
        {@render frageEditor()}
        {#if fertigGewaehlt}{@render pruefBlock()}{/if}
        {@render rechnenZeile()}
      </details>
    {/if}
  </div></div></section>

  <section use:weich class="feld" aria-label={L('Schritt 3', 'Step 3')}><span class="nr fertig" aria-hidden="true"><Icon n="haken" /></span><div><h2 id="f3-t" tabindex="-1">{L('Ergebnis', 'Result')}</h2>
    {#if hinweisAn}<p class="live-hinweis"><span aria-hidden="true"><Rechnet text={(rStatus.laedt && rStatus.text) || L('Wird neu gerechnet …', 'Recalculating …')} /></span> <Abbrechen aktiv={wartet} /></p>{/if}
    {#if fehlt.length}{@const liste = fehlt.map(n => zitat(n)).join(', ')}<p class="fehlt-hinweis" role="alert"><b>{Lp(fehlt.length, `Die Spalte ${liste} gibt es nicht mehr.`, `Die Spalten ${liste} gibt es nicht mehr.`, `The column ${liste} no longer exists.`, `The columns ${liste} no longer exist.`)}</b> {d('Dieses Blatt lässt sich nicht mehr rechnen, und die alten Zahlen gelten nicht mehr. Es kommt nicht in den Bericht. Stelle die Frage mit einer anderen Spalte neu, oder mach das Entfernen auf der Spalten-Seite rückgängig.', 'Dieses Blatt lässt sich nicht mehr rechnen, und die alten Zahlen gelten nicht mehr. Es kommt nicht in den Bericht. Stellen Sie die Frage mit einer anderen Spalte neu, oder machen Sie das Entfernen auf der Spalten-Seite rückgängig.', 'This page can no longer be calculated, and the old numbers are no longer valid. It is left out of the report. Ask the question again with another column, or undo the removal on the columns page.')}</p>{/if}
    <div class="feld-inhalt ergebnis-spalten" bind:this={ergebnisOrt} class:gedimmt={gedimmt || ueberholt} class:fehlt-weg={fehlt.length > 0} aria-busy={wartet ? 'true' : undefined}>
    {#if ueberholt && !wartet && !blatt.gesperrt}<p class="heft-text ueberholt" use:ergebnisAnsage><b>{L('Stand der alten Auswahl.', 'Result of the previous selection.')}</b> {veraltet ? L('Die Daten haben sich seit der Rechnung geändert.', 'The data has changed since this was calculated.') : d('Du hast die Auswahl geändert, dieses Ergebnis ist noch nicht neu gerechnet. „Neu rechnen“ oben aktualisiert es.', 'Sie haben die Auswahl geändert, dieses Ergebnis ist noch nicht neu gerechnet. „Neu rechnen“ oben aktualisiert es.', 'The selection was changed, this result has not been recalculated yet. "Recalculate" above updates it.')}</p>{/if}
    {#if blatt.gesperrt}
      <div class="gesperrt-hinweis" role="alert" id="gesperrt-meldung" tabindex="-1">
        <p class="ergebnis-satz">{L('Diese Auswertung lässt sich so nicht rechnen.', 'This analysis cannot be calculated like this.')}</p>
        {#if blatt.fehler}<p class="heft-text" style="margin-top:var(--a2)"><b>{blatt.fehler}</b></p>{/if}
        {#each pruefliste.filter(p => p.art === 'sperre') as p (p.text)}<p class="heft-text" style="margin-top:var(--a2)"><b>{p.text}{p.text.match(/[.!?:]$/) ? '' : '.'}</b>{#if p.klein}{' '}{p.klein}{/if}</p>{/each}
        <p class="heft-text" style="margin-top:var(--a2)">{d('Das frühere Ergebnis ist entfernt und kommt nicht in den Bericht. Sobald du die Frage so änderst, dass sie sich rechnen lässt, erscheint das neue Ergebnis.', 'Das frühere Ergebnis ist entfernt und kommt nicht in den Bericht. Sobald Sie die Frage so ändern, dass sie sich rechnen lässt, erscheint das neue Ergebnis.', 'The earlier result has been removed and is not part of the report. As soon as you change the question so that it can be calculated, the new result appears.')}</p>
      </div>
    {:else if saetze && erg}
      {#if rangEmpfehlung && blatt}<RangEmpfehlung {blatt} paired={rangEmpfehlung.paired} rang={rangEmpfehlung.rang} nachrechnen={rangNeu} vorschlag={rangEmpfehlung.vorschlag} sperre={rangEmpfehlung.sperre} />{/if}
      {#if s.einst.ohneDeutung && !deutungGezeigt[blatt?.id ?? '']}
        <p class="ergebnis-satz">{L('Übungsmodus: Die Deutung ist ausgeblendet. Zuerst die Kennzahlen unten lesen und das Ergebnis selbst in Worte fassen.', 'Practice mode: the interpretation is hidden. First read the key figures below and put the result into words yourself.')}</p>
        <div class="knopfzeile"><button class="k" type="button" onclick={() => (deutungGezeigt[blatt?.id ?? ''] = true)}>{L('Deutung zeigen', 'Show interpretation')}</button></div>
      {:else}
      <p class="ergebnis-satz">{saetze.haupt}</p>
      {#if saetze.zusatz || saetze.vorsicht}<SatzMitListen text={`${saetze.zusatz} ${saetze.vorsicht}`.trim()} listen={saetze.listen} />{/if}
      {/if}
      {#if ebenenErgebnis}<EbenenHinweis v={ebenenErgebnis.v} w={ebenenErgebnis.vorschlag} />{/if}
      <div class="marken" role="group" aria-label={L('Kennzahlen, zum Erklären auswählen', 'Key figures, tap to explain')}>
        {#each saetze.marken as m}<button class="marke-k" class:hinweis={m.hinweis} type="button" data-tipp={L('Klicken: erklärt diese Angabe in einfachen Worten', 'Click: explains this figure in plain words')} aria-pressed={randKey === m.erklaer} onclick={() => (randKey = m.erklaer)}>{#if m.hinweis}<Icon n="hinweis" />{/if}{m.text}</button>{/each}
        <button class="marke-k" type="button" aria-pressed={randKey === 'test-warum'} onclick={() => (randKey = 'test-warum')}>{L('Warum dieses Verfahren?', 'Why this method?')}</button>
        {#if vf}<HilfeLink id={rangBlatt?.art === 'friedman' ? 'friedman-test' : erg.typ === 'mcnemar' || erg.typ === 'cochran' ? 'mcnemar-test-cochran-q' : erg.typ === 'anova2' ? 'zweifaktorielle-varianzanalyse' : erg.typ === 'ancova' ? 'kovarianzanalyse' : erg.typ === 'hierreg' ? 'hierarchische-regression' : (erg.typ === 'quantil' ? 'quantilregression' : erg.typ === 'penal' ? 'strafregression' : erg.typ === 'probit' ? 'probit-regression' : erg.typ === 'wls' ? 'gewichtete-regression' : erg.typ === 'nls' ? 'nichtlineare-regression' : katHilfeId(erg.typ)) ?? `frage-${vf.id}`} text={rangBlatt?.art === 'friedman' ? L('Hilfe: Friedman-Test lesen', 'Help: reading the Friedman test') : erg.typ === 'mcnemar' || erg.typ === 'cochran' ? L('Hilfe: McNemar-Test und Cochran-Q lesen', "Help: reading the McNemar test and Cochran's Q") : erg.typ === 'anova2' ? L('Hilfe: Zweifaktorielle Varianzanalyse lesen', 'Help: reading the two-way analysis of variance') : erg.typ === 'ancova' ? L('Hilfe: Kovarianzanalyse lesen', 'Help: reading the analysis of covariance') : erg.typ === 'hierreg' ? L('Hilfe: Hierarchische Regression lesen', 'Help: reading the hierarchical regression') : erg.typ === 'quantil' ? L('Hilfe: Quantilregression lesen', 'Help: reading quantile regression') : erg.typ === 'penal' ? L('Hilfe: Ridge, Lasso und Elastic Net lesen', 'Help: reading ridge, lasso and elastic net') : erg.typ === 'probit' ? L('Hilfe: Probit-Regression lesen', 'Help: reading probit regression') : erg.typ === 'wls' ? L('Hilfe: Gewichtete Regression lesen', 'Help: reading weighted regression') : erg.typ === 'ordreg' ? L('Hilfe: Ordinale Regression lesen', 'Help: reading ordinal regression') : erg.typ === 'multreg' ? L('Hilfe: Multinomiale Regression lesen', 'Help: reading multinomial regression') : erg.typ === 'nls' ? L('Hilfe: Nichtlineare Regression lesen', 'Help: reading nonlinear regression') : erg.typ === 'zaehlreg' ? L('Hilfe: Zähldaten-Regression lesen', 'Help: reading count regression') : L('Hilfe zu dieser Frageart: Voraussetzungen und Beispiel', 'Help on this type of question: requirements and example')} />{/if}
      </div>
      {#if saetze.bayes}
        <details class="auf bayes-zeile" style="margin-bottom:var(--a3)"><summary>{L('Bayes-Faktor', 'Bayes factor')}: {saetze.bayes.kopf}</summary>
          <p class="heft-text">{saetze.bayes.satz}</p>
          <p class="heft-text">{saetze.bayes.einordnung}</p>
          <p class="heft-text"><b>{L('Für Fachleute', 'For specialists')}{dp()}</b> {saetze.bayes.fachleute} <HilfeLink id="bayes-faktor" text={L('Hilfe zum Bayes-Faktor', 'Help on the Bayes factor')} /></p>
        </details>
      {/if}
      {#if erg.typ === 'ohne-streuung' && erg.art === 'prae-post' && erg.rang && blatt.l1 && blatt.l2}<BlattRang {blatt} paired={true} rang={erg.rang} nachrechnen={rangNeu} weitere={weitereRang} vorschlag={rangVorschlagFuer('prae-post', blatt.l1, blatt.l2)} />{/if}
      {#if erg.typ === 'zwei-gruppen' || erg.typ === 'anova' || erg.typ === 'prae-post'}<BlattRang {blatt} robustDaten={robustDatenFuer(erg)} paired={erg.typ === 'prae-post'} sperre={erg.typ === 'prae-post' ? gwSatz('praepost:vorzeichen') ?? gwSatz('praepost:wilcoxon') : gwSatz('gruppen:rang-weitere') ?? gwSatz('gruppen:rang')} rang={erg.rang ?? null} nachrechnen={rangNeu} weitere={weitereRang} gruppenZahl={erg.typ === 'zwei-gruppen' ? 2 : erg.typ === 'anova' ? erg.e.gruppen.length : null} grund={erg.typ === 'prae-post' ? rangGrundText(erg.e.vorher, erg.e.nachher) : null} vorschlag={erg.typ === 'prae-post' ? rangVorschlagFuer('prae-post', erg.e.vorher, erg.e.nachher) : rangVorschlagFuer('gruppen', erg.e.abhaengig, erg.e.gruppenSpalte)} />{/if}
      {#if erg.typ === 'messwiederholung' && !erg.e.gruppenSpalte}<BlattRang {blatt} paired="mw" rang={erg.rang ?? null} nachrechnen={rangNeu} vorschlag={null} />{/if}
      {#if erg.typ === 'mcnemar' || erg.typ === 'cochran'}
        <div class="korr-wahl" style="margin-top:var(--a4)">
          <label class="schalter"><input type="checkbox" checked={erg.e.ja.umgekehrt} onchange={(ev) => jaUmkehren(ev.currentTarget.checked)}>{L('„ja“ und „nein“ vertauschen', 'Swap "yes" and "no"')}</label>
          <p style="color:var(--tinte-2);margin-top:var(--a2)">{jaNeinSatz(erg.e.ja)} {erg.typ === 'mcnemar' ? L('Vertauschen ändert die Anteile und die Richtung des Odds Ratio, nicht den p-Wert.', 'Swapping changes the shares and the direction of the odds ratio, not the p value.') : L('Vertauschen ändert die Anteile, nicht Q und p.', 'Swapping changes the shares, not Q and p.')}</p>
        </div>
      {/if}
      {#if erg.typ === 'korrmatrix'}
        {@const km = erg.e}
        <div class="korr-wahl" role="radiogroup" aria-labelledby="km-art-t" style="margin-top:var(--a4)">
          <h3 id="km-art-t" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Art der Korrelation', 'Type of correlation')}</h3>
          <div class="segment">{#each [['pearson', 'Pearson (r)'], ['spearman', 'Spearman (rs)']] as [w, t]}<label data-begriff={w === 'spearman' ? 'spearman' : 'pearson-korrelation'}><input type="radio" name="km-art" value={w} checked={km.methode === w} onchange={() => { blatt!.ergebnis = { typ: 'korrmatrix', e: { ...km, methode: w as 'pearson' | 'spearman' } }; sichern(); melde(L(`Jetzt: ${t}.`, `Now: ${t}.`)); }}>{t}</label>{/each}</div>
          <p style="color:var(--tinte-2);margin-top:var(--a2)">{matrixGrundText(km.grund, km.methode)} {L('Die Art gilt für alle Paare.', 'The type applies to all pairs.')}</p>
          <label data-begriff="holm" class="schalter" style="margin-top:var(--a3)"><input type="checkbox" checked={km.holm} onchange={(ev) => { const an = ev.currentTarget.checked; blatt!.ergebnis = { typ: 'korrmatrix', e: { ...km, holm: an } }; sichern(); melde(an ? L('p-Werte jetzt nach Holm korrigiert.', 'p values now Holm-adjusted.') : L('p-Werte ohne Korrektur.', 'p values without adjustment.')); }}>{L('p-Werte nach Holm korrigieren', 'Holm-adjust the p values')}</label>
          <p style="color:var(--tinte-2);margin-top:var(--a2)">{holmText()}</p>
        </div>
      {/if}
      {#if erg.typ === 'zusammenhang' && erg.e.alle && !(erg.e.kontroll?.length && !erg.e.alle.pearson && !erg.e.alle.spearman)}
        <div class="korr-wahl" role="radiogroup" aria-labelledby="korr-t" style="margin-top:var(--a4)">
          <h3 id="korr-t" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Art der Korrelation', 'Type of correlation')}</h3>
          <div class="segment">{#each [['pearson', erg.e.kontroll?.length ? 'Pearson (pr)' : 'Pearson (r)'], ['spearman', erg.e.kontroll?.length ? 'Spearman (prs)' : 'Spearman (rs)'], ...(erg.e.kontroll?.length ? [] : [['kendall', 'Kendall (τb)']])] as [w, t]}<label data-begriff={w === 'spearman' ? 'spearman' : w === 'kendall' ? 'kendall' : 'pearson-korrelation'}><input type="radio" name="korr-art" value={w} checked={(erg.e.methode ?? 'pearson') === w} onchange={() => { blatt!.ergebnis = { typ: 'zusammenhang', e: zusammenhangMit(erg.e, w as 'pearson' | 'spearman' | 'kendall') }; sichern(); melde(L(`Jetzt: ${korrName(w as 'pearson', !!erg.e.kontroll?.length)}.`, `Now: ${korrName(w as 'pearson', !!erg.e.kontroll?.length)}.`)); }}>{t}</label>{/each}</div>
          <p style="color:var(--tinte-2);margin-top:var(--a2)">{korrelationsGrundText(erg.e.grund, erg.e.methode ?? 'pearson')}</p>
        </div>
      {/if}
      {#if erg.typ === 'kappa' && erg.e.gewichtbar}
        <div class="korr-wahl" role="radiogroup" aria-labelledby="gew-t" style="margin-top:var(--a4)">
          <h3 id="gew-t" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Gewichtung', 'Weighting')}</h3>
          <div class="segment">{#each [['keins', L('Ungewichtet', 'Unweighted')], ['linear', L('Linear gewichtet', 'Linearly weighted')], ['quadratisch', L('Quadratisch gewichtet', 'Quadratically weighted')]] as [w, tx]}<label><input type="radio" name="gew-art" value={w} checked={erg.e.gewicht === w} onchange={() => { blatt!.ergebnis = { typ: 'kappa', e: kappaMit(erg.e, w as Gewicht) }; sichern(); melde(L(`Jetzt: ${gewichtName(w as Gewicht)}.`, `Now: ${gewichtName(w as Gewicht)}.`)); }}>{tx}</label>{/each}</div>
          <p style="color:var(--tinte-2);margin-top:var(--a2)">{L('Die Stufen sind Zahlen und damit geordnet: Eine Abweichung um eine Stufe wiegt weniger als eine um drei. Gewichtetes Kappa berücksichtigt das (linear: der Abstand zählt proportional; quadratisch: große Abstände zählen besonders stark). Ungewichtet zählt jede Abweichung gleich.', 'The levels are numbers and so ordered: a difference of one level weighs less than one of three. Weighted kappa takes that into account (linear: the distance counts proportionally; quadratic: large distances count especially heavily). Unweighted counts every difference equally.')}</p>
        </div>
      {/if}
      {#if erg.typ === 'icc'}
        <div class="korr-wahl" role="radiogroup" aria-labelledby="icc-w" style="margin-top:var(--a4)">
          <h3 id="icc-w" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Sollen die Werte gleich sein, oder darf ein fester Unterschied zwischen den Beurteilenden bestehen?', 'Should the values be identical, or may raters differ by a constant amount?')}</h3>
          <div class="segment">{#each [['absolut', L('Gleich (absolute Übereinstimmung)', 'The same (absolute agreement)')], ['konsistenz', L('Fester Unterschied erlaubt (Konsistenz)', 'Constant difference allowed (consistency)')]] as [w, tx]}<label><input type="radio" name="icc-modell" value={w} checked={erg.e.modell === w} onchange={() => { blatt!.ergebnis = { typ: 'icc', e: { ...erg.e, modell: w as IccModell } }; sichern(); melde(w === 'absolut' ? L('Jetzt: absolute Übereinstimmung, ICC(2,·).', 'Now: absolute agreement, ICC(2,·).') : L('Jetzt: Konsistenz, ICC(3,·).', 'Now: consistency, ICC(3,·).')); }}>{tx}</label>{/each}</div>
          <p style="color:var(--tinte-2);margin-top:var(--a2)">{erg.e.modell === 'absolut'
            ? L('Standard: Wenn es auf die Zahl selbst ankommt (derselbe Aufsatz soll dieselbe Punktzahl bekommen), zählt es auch, wenn eine Person durchgehend strenger ist. Das ist ICC(2,·) im Zweifach-Modell mit zufälligen Beurteilenden (McGraw & Wong: ICC(A,·)).', 'Default: if the number itself matters (the same essay should get the same score), it also counts when one rater is consistently stricter. This is ICC(2,·) in the two-way random model (McGraw & Wong: ICC(A,·)).')
            : L('Soll ein fester Unterschied in der Strenge nicht zählen (jemand gibt immer zwei Punkte mehr), gilt die Konsistenz: Sie verlangt gleiche Abstände, nicht gleiche Werte. Das ist ICC(3,·) im Zweifach-Modell mit festen Beurteilenden (McGraw & Wong: ICC(C,·)); die Aussage gilt nur für diese Beurteilenden.', 'If a constant difference in strictness should not count (one rater always gives two points more), consistency applies: it requires the same distances, not the same values. This is ICC(3,·) in the two-way mixed model (McGraw & Wong: ICC(C,·)); the statement holds only for these raters.')}</p>
        </div>
      {/if}
      {#if erg.typ === 'messwiederholung' && erg.e.zeitpunkte.length >= 3 && !rangBlatt}
        {@const mw = erg.e}
        <div class="korr-wahl" role="radiogroup" aria-labelledby="mw-kor" style="margin-top:var(--a4)">
          <h3 id="mw-kor" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Korrektur für die Sphärizität', 'Correction for sphericity')}</h3>
          <div class="segment">{#each [['gg', L('Greenhouse-Geisser (Standard)', 'Greenhouse-Geisser (default)')], ['hf', 'Huynh-Feldt'], ['keine', L('Keine', 'None')]] as [w, tx]}<label data-begriff={w === 'gg' ? 'greenhouse-geisser' : w === 'hf' ? 'huynh-feldt' : undefined}><input type="radio" name="mw-korrektur" value={w} checked={mw.korrektur === w} onchange={() => { blatt!.ergebnis = { typ: 'messwiederholung', e: { ...mw, korrektur: w as MwKorrektur } }; sichern(); melde(L(`Jetzt: ${w === 'gg' ? 'Greenhouse-Geisser' : w === 'hf' ? 'Huynh-Feldt' : L('keine Korrektur', 'no correction')}.`, `Now: ${w === 'gg' ? 'Greenhouse-Geisser' : w === 'hf' ? 'Huynh-Feldt' : L('keine Korrektur', 'no correction')}.`)); }}>{tx}</label>{/each}</div>
          <p style="color:var(--tinte-2);margin-top:var(--a2)">{L('Die Varianzanalyse setzt voraus, dass alle Differenzen zwischen zwei Zeitpunkten gleich stark streuen (Sphärizität). Ist das verletzt, werden die Freiheitsgrade mit ε verkleinert. Statable berichtet standardmäßig Greenhouse-Geisser, auch wenn der Mauchly-Test nichts anzeigt: Bei wenigen Personen erkennt er Abweichungen kaum, bei vielen schlägt er schon bei kleinen an. Huynh-Feldt ist etwas weniger streng und wird oft bei ε über ,75 gewählt.', 'The analysis assumes that all differences between two time points vary equally (sphericity). If that is violated, the degrees of freedom are reduced by ε. Statable reports Greenhouse-Geisser by default, even if Mauchly\'s test shows nothing: with few people it hardly detects departures, with many it responds even to small ones. Huynh-Feldt is somewhat less strict and often chosen when ε is above .75.')}</p>
        </div>
      {/if}
      {#if erg.typ === 'einzelfall'}
        {@const ef = erg.e}
        <div class="korr-wahl" role="radiogroup" aria-labelledby="ef-richtung" style="margin-top:var(--a4)">
          <h3 id="ef-richtung" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Was zählt als besser?', 'What counts as better?')}</h3>
          <div class="segment">{#each [['hoch', L('Höher ist besser', 'Higher is better')], ['tief', L('Niedriger ist besser (z. B. Fehler)', 'Lower is better (e.g. errors)')]] as [w, tx]}<label><input type="radio" name="ef-richtung" value={w} checked={ef.richtung === w} onchange={() => { blatt!.ergebnis = { typ: 'einzelfall', e: einzelfallMit(ef, w as Richtung) }; sichern(); melde(w === 'hoch' ? L('Jetzt: höher ist besser.', 'Now: higher is better.') : L('Jetzt: niedriger ist besser.', 'Now: lower is better.')); }}>{tx}</label>{/each}</div>
          <p style="color:var(--tinte-2);margin-top:var(--a2)">{L('NAP, PND und Tau beziehen sich auf die Richtung „besser“. Mittelwerte, Mediane und das Diagramm zeigen immer die gemessenen Werte.', 'NAP, PND and Tau refer to the direction “better”. Means, medians and the chart always show the measured values.')}{ef.faelle.length > 1 ? ' ' + L('Die Richtung gilt für alle Fälle gemeinsam.', 'The direction applies to all cases together.') : ''}</p>
        </div>
      {/if}
      {#if erg.typ === 'gewichtet' && erg.e.designB?.art === 'regression' && typeof erg.e.designB.r.ereignisse === 'number'}<p class="heft-text" style="margin-top:var(--a4)">{rocEntfaelltSatz()}</p>{/if}   <!-- Später S-D2: ROC und AUC entfallen - der Satz steht auch im Ergebnis, nicht nur vor dem Rechnen -->
      {#if erg.typ === 'logistik'}
        {@const lg = erg.e}
        <div class="korr-wahl" style="margin-top:var(--a4)">
          <label class="schalter"><input type="checkbox" checked={logUmkehr} onchange={(ev) => { logUmkehr = ev.currentTarget.checked; const neu = ctx.logistik(lg.ziel); if (neu) melde(L(`Jetzt ist „${neu.ereignisName}“ das Ereignis.`, `Now "${neu.ereignisName}" is the event.`)); }}>{L('Ereignis umkehren', 'Reverse the event')}</label>
          <p style="color:var(--tinte-2);margin-top:var(--a2)">{L(`Ereignis ist „${wertName(lg.ziel, lg.ereignis)}“ (gegen „${wertName(lg.ziel, lg.referenz)}“). Bei Zahlen gilt der größere Wert als Ereignis, bei Text die alphabetisch zweite Antwort - unabhängig von der Zeilenreihenfolge. Umkehren dreht nur die Richtung: B wechselt das Vorzeichen, das Odds Ratio wird zum Kehrwert.`, `The event is "${wertName(lg.ziel, lg.ereignis)}" (versus "${wertName(lg.ziel, lg.referenz)}"). For numbers the larger value is the event, for text the second answer in alphabetical order - regardless of row order. Reversing only turns the direction: B changes sign, the odds ratio becomes its reciprocal.`)}</p>
        </div>
      {/if}
      {#if erg.typ === 'kaplanmeier' && erg.e.einWert}
        <p style="color:var(--tinte-2);margin-top:var(--a4)">{kmEinWertText(erg.e)}</p>
      {:else if erg.typ === 'kaplanmeier'}
        {@const km = erg.e}
        <div class="korr-wahl" role="radiogroup" aria-labelledby="km-ereignis" style="margin-top:var(--a4)">
          <h3 id="km-ereignis" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Welcher Wert ist das Ereignis?', 'Which value is the event?')}</h3>
          <div class="segment">{#each km.werte as tx, i}<label><input type="radio" name="km-ereignis" value={i} checked={km.ereignisIndex === i} onchange={() => { const hatCox = !!km.cox || !!km.coxZeit || !!km.aft || !!km.frailty; blatt!.ergebnis = { typ: 'kaplanmeier', e: kaplanNeuMit(km, i as 0 | 1) }; if (hatCox) kmWahl = i as 0 | 1; sichern(); melde(hatCox ? L(`Jetzt ist „${tx}“ das Ereignis. Die Cox-Regression wird mit dem neuen Ereignis neu gerechnet.`, `Now "${tx}" is the event. The Cox regression is recalculated with the new event.`) : L(`Jetzt ist „${tx}“ das Ereignis.`, `Now "${tx}" is the event.`)); }}>{tx}</label>{/each}</div>
          <p style="color:var(--tinte-2);margin-top:var(--a2)">{kmVorschlagText(km, false)} {L('Der andere Wert gilt als zensiert. Beim Umschalten rechnet Statable alles neu.', 'The other value counts as censored. Switching recalculates everything.')}</p>
        </div>
      {/if}
      {#if katVorschlagErgebnis.length}<KatVorschlag punkte={katVorschlagErgebnis} wahl={vorschlagRechnen} laeuft={wartet || rechnet} gesperrt={sperreDa} />{/if}
      <figure style="margin:var(--a5) 0 0">
        {#if erg.typ === 'zwei-gruppen'}
          <div class:dg-editor={dgOffen}><DiagrammExport titel={dgTitel} sperre={gwSatz('diagramm:box')}><Gruppendiagramm e={erg.e} werte={erg.werte} o={dg!} xText={name(erg.e.gruppenSpalte)} /></DiagrammExport>
          {#if dgOffen}
            <form class="einstellungen klappt" transition:rutsch aria-labelledby="dg-ed-t" onsubmit={(ev) => ev.preventDefault()} oninput={() => sichern()} onchange={() => sichern()}>
              <h3 id="dg-ed-t" class="nur-vorleser">{L('Diagramm anpassen', 'Adjust chart')}</h3>
              <div class="einst-gruppe" style="padding-top:0"><h3>{L('Art', 'Type')}</h3><div class="segment" role="radiogroup" aria-label={L('Art', 'Type')}>{#each [['punkte', L('Punkte mit Mittelwert', 'Dots with mean')], ['balken', L('Säulen', 'Bars')], ['box', L('Kasten (Boxplot)', 'Box (boxplot)')]] as [w, t]}<label data-begriff={w === 'box' ? 'boxplot' : w === 'balken' ? 'saeulendiagramm' : undefined}><input type="radio" name="dg-art" value={w} bind:group={dg!.art}>{t}</label>{/each}</div>
                <p style="color:var(--tinte-2);margin-top:var(--a2)">{dgRat(dg!.art)}</p></div>
              {#if dg!.art !== 'box'}<div class="einst-gruppe"><h3>{L('Striche um den Mittelwert', 'Whiskers around the mean')}</h3><div class="segment" role="radiogroup" aria-label={L('Striche um den Mittelwert', 'Whiskers around the mean')}>{#each [['ki', L('95 %-KI', '95% CI')], ['se', L('Standardfehler', 'Standard error')], ['sd', L('Standardabweichung', 'Standard deviation')], ['keine', L('keine', 'none')]] as [w, t]}<label data-begriff={w === 'ki' ? 'konfidenzintervall' : w === 'se' ? 'standardfehler' : w === 'sd' ? 'standardabweichung' : undefined}><input type="radio" name="dg-fehler" value={w} bind:group={dg!.fehler}>{t}</label>{/each}</div></div>{/if}
              <div class="einst-gruppe">{#if dg!.art !== 'box'}<label class="schalter"><input type="checkbox" bind:checked={dg!.einzel}>{L('Einzelne Personen zeigen', 'Show individual people')}</label><br>{/if}
                <label class="schalter"><input type="checkbox" bind:checked={dg!.sw}>{L('Schwarz-weiß (für den Druck)', 'Black and white (for print)')}</label></div>
              <div class="einst-gruppe"><div class="eingabe"><label for="dg-titel-e">{L('Titel', 'Title')}</label><input type="text" id="dg-titel-e" bind:value={dg!.titel}></div>
                <div class="eingabe"><label for="dg-y">{L('Beschriftung der Hochachse', 'Vertical axis label')}</label><input type="text" id="dg-y" bind:value={dg!.y}></div></div>
              <div class="einst-gruppe"><h3>{L('Breite', 'Width')}</h3><div class="segment" role="radiogroup" aria-label={L('Breite', 'Width')}>{#each [['spalte', L('Halbe Seite', 'Half page')], ['seite', L('Ganze Breite', 'Full width')]] as [w, t]}<label><input type="radio" name="dg-breite" value={w} bind:group={dg!.breite}>{t}</label>{/each}</div></div>
              <div class="knopfzeile"><button class="k leise" type="button" onclick={() => { blatt!.dg = dgGrund(blatt!.titel, name(erg.e.abhaengig)); sichern(); melde(L('Diagramm wie vorgeschlagen.', 'Chart reset to the suggestion.')); }}><Icon n="rueck" />{L('Wie vorgeschlagen', 'As suggested')}</button></div>
            </form>
          {/if}</div>
          <div class="knopfzeile" style="margin-top:var(--a3)">
            <button class="k leise" type="button" aria-expanded={dgOffen} onclick={() => { dgOffen = !dgOffen; if (dgOffen) tick().then(() => document.querySelector<HTMLElement>('[name="dg-art"]:checked')?.focus()); }}><Icon n="regler" />{dgOffen ? L('Fertig', 'Done') : L('Diagramm anpassen', 'Adjust chart')}</button>
          </div>
        {:else if erg.typ === 'prae-post'}<DiagrammExport titel={dgTitel} sperre={gwSatz('diagramm:verlauf')}><Praepostdiagramm e={erg.e} paare={punkte} vorherText={name(erg.e.vorher)} nachherText={name(erg.e.nachher)} /></DiagrammExport>
        {:else if erg.typ === 'kappa'}<Kappatabelle e={erg.e} aText={name(erg.e.a)} bText={name(erg.e.b)} kat={katName} />{#if erg.e.inter}<Ausgabe items={tabellenInter(erg.e.inter)} nurTabellen /><HilfeLink id="intercoder" text={L('Hilfe: Krippendorffs Alpha und Intercoder-Übereinstimmung', 'Help: Krippendorff\'s alpha and intercoder agreement')} />{/if}
        {:else if erg.typ === 'inter'}<Ausgabe items={belegTabellen} nurTabellen /><HilfeLink id="intercoder" text={L('Hilfe: Intercoder-Übereinstimmung', 'Help: intercoder agreement')} />
        {:else if erg.typ === 'messwiederholung'}
          {@const nm = mwNamen(erg.e)}
          <DiagrammExport titel={dgTitel}><Zeitdiagramm e={erg.e} zeitTexte={erg.e.zeitpunkte.map((_, i) => nm.zn(i))} gruppenTexte={erg.e.gruppen.map((_, q) => nm.gruppen(q))} /></DiagrammExport>
        {:else if erg.typ === 'kaplanmeier'}
          {@const km = erg.e}
          {#if km.sterbe}
            <BlattSterbetafel e={km} {name} neu={sterbeNeu} />
          {:else}
          <DiagrammExport titel={dgTitel}><Kaplandiagramm e={km} zeitName={name(km.zeit)} /></DiagrammExport>
          <div class="korr-wahl" style="margin-top:var(--a3)">
            <label data-begriff="konfidenzintervall" class="schalter"><input type="checkbox" checked={km.band} onchange={(ev) => { blatt!.ergebnis = { typ: 'kaplanmeier', e: { ...km, band: ev.currentTarget.checked } }; sichern(); }}>{L('95 %-Band zeigen', 'Show 95% band')}</label>
          </div>
          {/if}
        {:else if erg.typ === 'einzelfall'}
          {@const ef = erg.e}
          <DiagrammExport titel={dgTitel}><Einzelfalldiagramm e={ef} yText={name(ef.mess)} zeitText={ef.zeit ? name(ef.zeit) : ''} /></DiagrammExport>
          <div class="korr-wahl" role="radiogroup" aria-labelledby="ef-linien" style="margin-top:var(--a3)">
            <h3 id="ef-linien" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Linie je Phase im Diagramm', 'Line per phase in the chart')}</h3>
            <div class="segment">{#each [['mittel', L('Mittelwert', 'Mean')], ['trend', L('Trend', 'Trend')], ['keine', L('Keine', 'None')]] as [w, tx]}<label data-begriff={w === 'mittel' ? 'mittelwert' : w === 'trend' ? 'trend' : undefined}><input type="radio" name="ef-linien" value={w} checked={ef.linien === w} onchange={() => { blatt!.ergebnis = { typ: 'einzelfall', e: { ...ef, linien: w as Einzelfall['linien'] } }; sichern(); }}>{tx}</label>{/each}</div>
          </div>
        {:else if erg.typ === 'anova2'}
          <DiagrammExport titel={dgTitel}><Interaktionsdiagramm e={erg.e} aText={name(erg.e.aCol)} bText={name(erg.e.bCol)} yText={name(erg.e.yCol)} /></DiagrammExport>
        {:else if erg.typ === 'ancova'}
        {:else if erg.typ === 'mediation'}
          <DiagrammExport titel={dgTitel}><Mediationsdiagramm e={erg.e} xText={name(erg.e.x)} mText={name(erg.e.m)} yText={name(erg.e.y)} /></DiagrammExport>
        {:else if erg.typ === 'quantil'}<BlattQuantil {blatt} e={erg.e} {name} />
        {:else if erg.typ === 'penal'}<BlattPenreg {blatt} e={erg.e} {name} />
        {:else if erg.typ === 'moderation'}
          <DiagrammExport titel={dgTitel}><Moderationsdiagramm e={erg.e} xText={name(erg.e.x)} yText={name(erg.e.y)} wText={name(erg.e.w)} /></DiagrammExport>
        {:else if erg.typ === 'mehrebenen'}
          <DiagrammExport titel={dgTitel}><Raupendiagramm e={erg.e} yText={name(erg.e.y)} gText={name(erg.e.gruppe)} /></DiagrammExport>
        {:else if erg.typ === 'meta'}
          <DiagrammExport titel={L('Forest-Plot', 'Forest plot')} klasse="dgx-scroll"><Forestplot e={erg.e} /></DiagrammExport>
          <DiagrammExport titel={L('Funnel-Plot', 'Funnel plot')}><Trichterdiagramm e={erg.e} /></DiagrammExport>
        {:else if mfListe.length}
          {#each mfListe as m, mi (m.set)}
            <DiagrammExport titel={`${L('Mehrfachantworten', 'Multiple responses')} ${m.label}`} klasse="mf-bild"><Mehrfachdiagramm {m} /></DiagrammExport>
          {/each}
          <div class="korr-wahl" style="margin-top:var(--a3)">
            <label class="schalter"><input type="checkbox" checked={mfListe[0]!.sortiert} onchange={(ev) => mfSortiert(ev.currentTarget.checked)}>{L('Nach Häufigkeit sortieren', 'Sort by frequency')}</label>
            {#if mfNeuRechnenMoeglich}{#each mfListe as mm (mm.set)}{#if basisFrage(mm)}<p class="basis-frage" class:stark={basisFrage(mm)!.stark} role="note">{basisFrageText(mm)}</p>{/if}{/each}<br><label class="schalter"><input type="checkbox" checked={mfListe[0]!.mitNull} onchange={(ev) => mfMitNullSetzen(ev.currentTarget.checked)}>{L('Fälle ohne Ankreuzung mitzählen', 'Include cases without a check')}</label>
              <p style="color:var(--tinte-2);margin-top:var(--a2)">{L('Standard wie in SPSS: Gültig sind Fälle mit mindestens einer Ankreuzung. Mit dem Haken gelten alle als gültig, die mindestens eine Angabe haben (auch „nicht angekreuzt“); die Prozente der Fälle beziehen sich dann auf alle Befragten, die geantwortet haben.', 'Default as in SPSS: valid cases are those with at least one check. With the box checked, everyone with at least one answer (even "not checked") is valid; percent of cases then refers to all respondents who answered.')}</p>{/if}
          </div>
          <Ausgabe items={belegTabellen} nurTabellen />
        {:else if erg.typ === 'anova'}
          <BalkenBlock yName={erg.e.abhaengig} gName={erg.e.gruppenSpalte} {name} />
          <Ausgabe items={belegTabellen} nurTabellen />
        {:else if erg.typ === 'gewichtet' && erg.e.karte === 'gruppen' && (erg.e.gruppen || erg.e.designB?.art === 'gruppen')}
          <!-- Später S-F2 (E), Prüfung M3: das Bild auch mit Umfragegewicht - ohne „Ja“ Mittelwerte ohne Striche, mit „Ja“ Striche aus survey (wie die Tabelle des Gruppenvergleichs) -->
          <BalkenBlock yName={erg.e.gruppen?.y ?? erg.e.designB!.ziel} gName={erg.e.gruppen?.g ?? erg.e.designB!.gruppenSpalte!} {name} />
          <Ausgabe items={belegTabellen} nurTabellen />
        {:else if erg.typ === 'zeitreihen'}
          <BlattZeitreihe {blatt} e={erg.e} {name} tabellen={belegTabellen} />
        {:else if erg.typ === 'cluster'}
          <BlattCluster {blatt} e={erg.e} {name} tabellen={belegTabellen} />
        {:else if erg.typ === 'diskriminanz'}<BlattDiskriminanz {blatt} e={erg.e} tabellen={belegTabellen} /><DiskrStruktur e={erg.e} {name} />
        {:else if erg.typ === 'loglinear'}<BlattLoglinear {blatt} e={erg.e} {name} tabellen={belegTabellen} />
        {:else if erg.typ === 'armut'}<BlattArmut {blatt} e={erg.e} {name} tabellen={belegTabellen} />
        {:else if erg.typ === 'manova'}<BlattKurspaket tabellen={belegTabellen} rcode={manovaRCode(erg.e.gruppe, erg.e.ziele)} hilfeId="frage-manova" hilfeText={L('Hilfe: MANOVA lesen und berichten', 'Help: reading and reporting a MANOVA')} /><ManovaFolge e={erg.e} {name} />
        {:else if erg.typ === 'probit'}<BlattKurspaket tabellen={belegTabellen} rcode={probitRCode(erg.e.ziel, erg.e.praed.map(x => x.name))} hilfeId="probit-regression" hilfeText={L('Hilfe: Probit-Regression lesen', 'Help: reading probit regression')} />
        {:else if erg.typ === 'nls'}<BlattKurspaket tabellen={belegTabellen} rcode={nlsRCode(erg.e.ziel, erg.e.praed, erg.e.art)} hilfeId="nichtlineare-regression" hilfeText={L('Hilfe: Nichtlineare Regression lesen', 'Help: reading nonlinear regression')}>{#snippet vorn()}<Nlsdiagramm e={erg.e} />{/snippet}</BlattKurspaket>
        {:else if erg.typ === 'wls'}<BlattKurspaket tabellen={belegTabellen} rcode={wlsRCode(erg.e.ziel, erg.e.praed.map(x => x.name), erg.e.gewicht)} hilfeId="gewichtete-regression" hilfeText={L('Hilfe: Gewichtete Regression lesen', 'Help: reading weighted regression')} />
        {:else if erg.typ === 'faelle'}
          <!-- die Fälle stehen unter der Abbildung, in FaelleBlatt -->
        {:else if erg.typ === 'icc'}{#if iccDaten.length}<DiagrammExport titel={dgTitel}><Iccdiagramm e={erg.e} daten={iccDaten} namen={erg.e.spalten.map(name)} /></DiagrammExport>{/if}
        {:else if erg.typ === 'zusammenhang'}<DiagrammExport titel={dgTitel} sperre={gwSatz('diagramm:streu')}><Streudiagramm {punkte} rang={(erg.e.methode ?? 'pearson') !== 'pearson'} xText={erg.e.kontroll?.length ? L(`${name(erg.e.x)} (bereinigt)`, `${name(erg.e.x)} (adjusted)`) : name(erg.e.x)} yText={erg.e.kontroll?.length ? L(`${name(erg.e.y)} (bereinigt)`, `${name(erg.e.y)} (adjusted)`) : name(erg.e.y)} /></DiagrammExport>{#if !erg.e.kontroll?.length && (erg.e.methode ?? 'pearson') === 'pearson' && !blatt?.gewicht}<KurvenAnpassung {punkte} xName={name(erg.e.x)} yName={name(erg.e.y)} ziel={kursZielFrisch(blatt, 'kurven')} /><KalibrierBlock {punkte} xName={name(erg.e.x)} yName={name(erg.e.y)} ziel={kursZielFrisch(blatt, 'kalibrier')} />{/if}
        {:else}<Ausgabe items={belegTabellen} nurTabellen />{/if}
      </figure>
      {#if erg.typ === 'faelle'}<FaelleBlatt {blatt} />{/if}
      <BlattDiagramme {blatt} {erg} {name} />
      {#if erg.typ === 'ordreg' || erg.typ === 'multreg' || erg.typ === 'zaehlreg'}<BlattKategorie {blatt} e={erg.e} {name} onModell={multinomialRechnen} laeuft={wartet || rechnet} gesperrt={sperreDa} />{/if}
    {:else}
      <p class="heft-text" style="margin-bottom:var(--a3)">{d('Hier stehen die Ergebnisse von PSPP als Tabellen. Eine Erklärung in Worten gibt es für dieses Verfahren noch nicht - siehe „Warum dieses Verfahren?“ oder die Hilfe.', 'Hier stehen die Ergebnisse von PSPP als Tabellen. Eine Erklärung in Worten gibt es für dieses Verfahren noch nicht - siehe „Warum dieses Verfahren?“ oder die Hilfe.', 'The PSPP results are shown here as tables. There is no explanation in words for this method yet - see "Why this method?" or the help page.')}</p>
      <div class="marken"><button class="marke-k" type="button" onclick={() => (randKey = 'test-warum')}>{L('Warum dieses Verfahren?', 'Why this method?')}</button></div>
      <Ausgabe items={hauptTabellen} />
      {#each blatt.art === 'befehle' ? (blatt.regstreu ?? regressionZuLauf(blatt.syntax)) : [] as r (r.x + '|' + r.y)}
        <DiagrammExport titel={L(`${r.y} und ${r.x} - Regressionsgerade`, `${r.y} and ${r.x} - regression line`)}><Streudiagramm punkte={r.punkte} xText={r.x} yText={r.y} /></DiagrammExport>
      {/each}
    {/if}
  </div></div></section>

  {#if !blatt.gesperrt && !fehlt.length && ((saetze && erg) || weitereAusgabe.length)}
  <section use:weich class="feld weiter-mit" class:kompakt={s.einst.profi} aria-label={L('Weitere Möglichkeiten', 'More options')}><span class="nr" aria-hidden="true"><Icon n="runter" /></span><div><h2 id="wm-t" tabindex="-1">{L('Weiter mit …', 'Next steps …')}</h2>
    {#if !s.einst.profi}<p class="wm-satz">{L('Hier steht alles, was zu diesem Ergebnis noch passt. Nichts davon ist Pflicht.', 'Everything else that fits this result. None of it is required.')}</p>{/if}
    <div class="wm-gruppe" role="group" aria-labelledby="wm-g-genauer"><h3 id="wm-g-genauer">{L('Genauer hinsehen', 'Look closer')}</h3>
      {#if !s.einst.profi}<p class="wm-satz">{L('Mehr über dasselbe Ergebnis: Voraussetzungen, Effekt, weitere Diagramme und Tabellen.', 'More about the same result: assumptions, effect, more charts and tables.')}</p>{/if}
      <div class="wm-inhalt">
{#if saetze && erg}
      {#if erg.typ === 'anova' && !rangBlatt}<BlattPosthoc {blatt} e={erg.e} /><KontrasteBlock e={erg.e} />{/if}
      {#if erg.typ === 'zwei-gruppen' || erg.typ === 'anova' || erg.typ === 'prae-post' || erg.typ === 'zusammenhang' || erg.typ === 'kreuz' || erg.typ === 'vorhersage' || erg.typ === 'verteilung'}<ExcelTiBlock e={erg.e} {name} />{/if}
      {#if erg.typ === 'zwei-gruppen'}<BlattKursFTest {blatt} e={erg.e} />{/if}
      {#if erg.typ === 'verteilung' && !erg.e.mehrfach?.length}<BlattAnpassung {blatt} e={erg.e} {melde} /><BlattKursVarianz {blatt} e={erg.e} {melde} /><BlattKursAnteil {blatt} e={erg.e} {melde} /><BlattVielfalt {blatt} e={erg.e} {melde} />{/if}
      {#if erg.typ === 'verteilung' && !erg.e.mehrfach?.length}<BlattReferenz {blatt} /><BlattAusreisser {blatt} />{/if}
      {#if !blatt?.gewicht}{#key blatt}
        {#if erg.typ === 'zusammenhang' && !erg.e.kontroll?.length}<StreuErweitert x={erg.e.x} y={erg.e.y} {name} />{/if}
        {#if erg.typ === 'vorhersage' && werte.l1[0] && regStreuX}<StreuErweitert x={regStreuX} y={werte.l1[0]} {name} />{/if}
        {#if erg.typ === 'moderation'}<StreuErweitert x={erg.e.x} y={erg.e.y} {name} />{/if}
        {#if erg.typ === 'korrmatrix'}<Streumatrix namen={erg.e.spalten} {name} />{/if}
        {#if erg.typ === 'messwiederholung' && !erg.e.gruppenSpalte && erg.e.zeitpunkte.length >= 2}<FehlerbalkenWiederholt spalten={erg.e.zeitpunkte} {name} />{/if}{#if erg.typ === 'messwiederholung' && !rangBlatt}<MwKontrasteEin spalten={erg.e.zeitpunkte} gruppenSpalte={erg.e.gruppenSpalte} {name} /><MwZweiBlock spalten={erg.e.zeitpunkte} gruppenSpalte={erg.e.gruppenSpalte} {name} />{/if}
        {#if erg.typ === 'prae-post'}<FehlerbalkenWiederholt spalten={[erg.e.vorher, erg.e.nachher]} {name} />{/if}
        {#if erg.typ === 'mehrebenen'}<SpaghettiBlock zeit={erg.e.praed.find(q => q.art === 'zahl')?.name ?? ''} wert={erg.e.y} person={erg.e.gruppe} {name} />{/if}
      {/key}{/if}
      {#if erg.typ === 'mehrebenen'}<MehrebenenZusatz {blatt} e={erg.e} />{/if}
      {#if erg.typ === 'meta'}<MetaZusatz {blatt} e={erg.e} />{/if}
      {#if erg.typ === 'verteilung'}<FehlendLittle {blatt} e={erg.e} /><RegelkarteBlock {blatt} e={erg.e} ziel={kursZielFrisch(blatt, 'regelkarte')} /><ZaehlkartenBlock ziel={kursZielFrisch(blatt, 'zaehlkarte')} />{/if}
      {#if erg.typ === 'vorhersage' && !blatt?.gewicht && werte.l1[0]}<DiagnoseBlock terme={regTerme(werte.l2, ctx.faktor)} ziel={werte.l1[0]} {name} />{/if}
      {#if erg.typ === 'logistik' && !blatt?.gewicht && werte.l1[0]}<LogistikPruefen terme={regTerme(werte.l2, ctx.faktor)} ziel={werte.l1[0]} ereignis={erg.e.ereignis} referenz={erg.e.referenz} {name} />{/if}
      {#if erg.typ === 'icc'}
        {@const r = erg.e.icc}
        <details class="auf" style="margin-top:var(--a4)"><summary>{L('Alle vier ICC-Maße', 'All four ICC measures')}</summary>
          <div style="overflow-x:auto"><table class="apa" style="margin-top:var(--a2)"><caption><b>{L('Intraklassen-Korrelation mit 95 %-KI', 'Intraclass correlation with 95% CI')}</b><i>{L(`F(${r.df1}, ${r.df2}) = ${Number.isFinite(r.f) ? zahlDe(r.f, 2) : '∞'}, ${r.n} Fälle, ${r.k} Beurteilende. „Einzel“: ein einzelnes Urteil; „Mittelwert“: der Mittelwert aus allen ${r.k} Urteilen.`, `F(${r.df1}, ${r.df2}) = ${Number.isFinite(r.f) ? zahlDe(r.f, 2) : '∞'}, ${r.n} cases, ${r.k} raters. "Single": one rating; "mean": the mean of all ${r.k} ratings.`)}</i></caption>
            <thead><tr><th scope="col">{L('Maß', 'Measure')}</th><th scope="col">ICC</th><th scope="col">{L('Untergrenze', 'Lower')}</th><th scope="col">{L('Obergrenze', 'Upper')}</th></tr></thead>
            <tbody>{#each [[`ICC(2,1) ${L('absolute Übereinstimmung, Einzel', 'absolute agreement, single')}`, r.absolut.einzel], [`ICC(2,${r.k}) ${L('absolute Übereinstimmung, Mittelwert', 'absolute agreement, mean')}`, r.absolut.mittel], [`ICC(3,1) ${L('Konsistenz, Einzel', 'consistency, single')}`, r.konsistenz.einzel], [`ICC(3,${r.k}) ${L('Konsistenz, Mittelwert', 'consistency, mean')}`, r.konsistenz.mittel]] as [bez, m]}
              <tr><th scope="row">{bez}</th><td>{zahlDe((m as typeof r.absolut.einzel).icc, 2)}</td><td>{Number.isFinite((m as typeof r.absolut.einzel).kiLo) ? zahlDe((m as typeof r.absolut.einzel).kiLo, 2) : '-'}</td><td>{Number.isFinite((m as typeof r.absolut.einzel).kiHi) ? zahlDe(Math.min(1, (m as typeof r.absolut.einzel).kiHi), 2) : '-'}</td></tr>{/each}</tbody></table></div>
        </details>
        {#if erg.e.ba && baDaten.length}
          {@const b = erg.e.ba}
          <details class="auf" style="margin-top:var(--a3)"><summary>{L('Bland-Altman: Wie groß sind die Unterschiede zwischen beiden Werten?', 'Bland-Altman: how large are the differences between the two values?')}</summary>
            <p class="heft-text" style="margin:var(--a2) 0">{L('Der ICC setzt die Abweichungen ins Verhältnis zu den Unterschieden zwischen den Fällen. Das Bland-Altman-Diagramm zeigt den Unterschied in der Einheit der Messung: auf der Waagerechten der Mittelwert beider Werte, auf der Senkrechten ihre Differenz. Der Bias ist die mittlere Differenz; zwischen den Übereinstimmungsgrenzen (Bias ± 1,96 SD) liegen etwa 95 % der Differenzen.', 'The ICC relates the disagreement to the differences between cases. The Bland-Altman plot shows the difference in the unit of measurement: the mean of both values on the horizontal axis, their difference on the vertical axis. The bias is the mean difference; about 95% of the differences lie between the limits of agreement (bias ± 1.96 SD).')}</p>
            {#if saetze?.ba}<p class="heft-text" style="margin:var(--a2) 0">{saetze.ba}</p>{/if}
            <DiagrammExport titel={`${dgTitel} - Bland-Altman`}><Blandaltmandiagramm ba={b} punkte={baDaten} aText={name(erg.e.spalten[0]!)} bText={name(erg.e.spalten[1]!)} /></DiagrammExport>
            <Ausgabe items={tabelleBlandAltman(erg.e, name)} nurTabellen />
            <HilfeLink id="frage-uebereinstimmung" text={L('Hilfe: Bland-Altman lesen', 'Help: reading Bland-Altman')} />
          </details>
        {/if}
        {#if erg.e.spalten.length === 2 && iccDaten.length}<BlattMethodenvergleich {blatt} daten={iccDaten} namen={[name(erg.e.spalten[0]!), name(erg.e.spalten[1]!)]} />{/if}
        {#if erg.e.te && baDaten.length}
          {@const te = erg.e.te}
          {@const ts = saetzeTypicalError(te, name(erg.e.spalten[0]!), name(erg.e.spalten[1]!))}
          <details class="auf" style="margin-top:var(--a3)"><summary>{L('Typical Error: Wie genau misst die Messung bei Wiederholung?', 'Typical error: how precise is the measurement on repetition?')}</summary>
            <p class="heft-text" style="margin:var(--a2) 0">{L('Der Typical Error passt, wenn dieselben Personen zweimal gemessen wurden und sich dazwischen nichts verändert hat (Test-Retest). Er zeigt in der Einheit der Messung, wie weit eine einzelne Messung typischerweise danebenliegt. Bei zwei Beurteilenden oder zwei Messverfahren vermischt er deren Unterschiede mit dem Messfehler.', 'The typical error fits when the same people were measured twice and nothing changed in between (test-retest). It shows, in the unit of measurement, how far a single measurement is typically off. With two raters or two measurement methods it mixes their differences with the measurement error.')}</p>
            <p class="heft-text" style="margin:var(--a2) 0">{ts.text}</p>
            <p style="color:var(--tinte-2);margin:var(--a2) 0">{ts.vorsicht}</p>
            <Ausgabe items={tabellenTypicalError(te, name, erg.e.spalten[0]!, erg.e.spalten[1]!)} nurTabellen />
            <label data-begriff="typical-error" class="schalter" style="margin-top:var(--a2)"><input type="checkbox" checked={!!erg.e.teBericht} onchange={(ev) => { blatt!.ergebnis = { typ: 'icc', e: { ...erg.e, teBericht: ev.currentTarget.checked } }; sichern(); melde(ev.currentTarget.checked ? L('Der Typical Error kommt in den Bericht.', 'The typical error goes into the report.') : L('Der Typical Error kommt nicht in den Bericht.', 'The typical error does not go into the report.')); }}>{L('Typical Error im Bericht zeigen', 'Show the typical error in the report')}</label>
            <p class="hilfe"><HilfeLink id="messgenauigkeit-typical-error" text={L('Hilfe: Typical Error', 'Help: typical error')} /></p>
          </details>
        {/if}
      {/if}
      {#if erg.typ === 'kreuz' && erg.e.zaehlung && erg.e.zaehlung.tab.length === 2 && erg.e.zaehlung.spalten.length === 2}
        {@const z = erg.e.zaehlung}
        {@const dw = erg.e.diagnose}
        <details class="auf" open={!!dw} style="margin-top:var(--a4)"><summary>{L('Testgüte berechnen (Test gegen Referenzstandard, z. B. Screening gegen Diagnose)', 'Calculate test accuracy (test against a reference standard, e.g. screening against diagnosis)')}</summary>
          <label data-begriff="goldstandard" class="schalter" style="margin-top:var(--a2)"><input type="checkbox" checked={!!dw} onchange={(ev) => { setzeDiagnose(ev.currentTarget.checked ? standardWahl(z.zeilen, z.spalten) : null); melde(ev.currentTarget.checked ? L('Jetzt gelesen als Test gegen einen Referenzstandard.', 'Now read as a test against a reference standard.') : L('Diagnostische Güte ausgeblendet.', 'Diagnostic accuracy hidden.')); }}>{L('Testgüte berechnen: eine Spalte ist der Referenzstandard, die andere der Test', 'Calculate test accuracy: one column is the reference standard, the other is the test')}</label>
          {#if dw}
            {@const refWerte = dw.ref === 'zeilen' ? z.zeilen : z.spalten}
            {@const testWerte = dw.ref === 'zeilen' ? z.spalten : z.zeilen}
            <div class="korr-wahl" role="radiogroup" aria-labelledby="dg-ref" style="margin-top:var(--a3)">
              <h3 id="dg-ref" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Welche Spalte ist der Referenzstandard (z. B. die Diagnose)?', 'Which column is the reference standard (e.g. the diagnosis)?')}</h3>
              <div class="segment">{#each [['zeilen', erg.e.gruppen], ['spalten', erg.e.gezaehlt]] as [w, tx]}<label><input type="radio" name="dg-ref" value={w} checked={dw.ref === w} onchange={() => { setzeDiagnose(w === 'zeilen' ? standardWahl(z.zeilen, z.spalten) : { ...standardWahl(z.spalten, z.zeilen), ref: 'spalten' }); melde(L(`Referenzstandard ist jetzt: ${tx}.`, `Reference standard is now: ${tx}.`)); }}>{tx}</label>{/each}</div>
            </div>
            <div class="korr-wahl" role="radiogroup" aria-labelledby="dg-rp" style="margin-top:var(--a3)">
              <h3 id="dg-rp" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Welcher Wert der Referenz gilt als positiv (z. B. krank)?', 'Which value of the reference counts as positive (e.g. ill)?')}</h3>
              <div class="segment">{#each refWerte as tx, i}<label><input type="radio" name="dg-rp" value={i} checked={dw.refPos === i} onchange={() => { setzeDiagnose({ ...dw, refPos: i }); melde(L(`Referenz positiv: ${tx}.`, `Reference positive: ${tx}.`)); }}>{tx}</label>{/each}</div>
            </div>
            <div class="korr-wahl" role="radiogroup" aria-labelledby="dg-tp" style="margin-top:var(--a3)">
              <h3 id="dg-tp" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Welcher Wert des Tests gilt als positiv (z. B. auffällig)?', 'Which value of the test counts as positive (e.g. flagged)?')}</h3>
              <div class="segment">{#each testWerte as tx, i}<label><input type="radio" name="dg-tp" value={i} checked={dw.testPos === i} onchange={() => { setzeDiagnose({ ...dw, testPos: i }); melde(L(`Test positiv: ${tx}.`, `Test positive: ${tx}.`)); }}>{tx}</label>{/each}</div>
            </div>
            <p style="color:var(--tinte-2);margin-top:var(--a2)">{L('Sensitivität: Anteil der Positiven, die der Test erkennt. Spezifität: Anteil der Negativen, die er als negativ erkennt. Die Vorhersagewerte hängen davon ab, wie häufig die Referenz in dieser Stichprobe positiv ist. Die Tabelle steht oben bei den Zahlen.', 'Sensitivity: the share of positives the test detects. Specificity: the share of negatives it recognizes as negative. The predictive values depend on how often the reference is positive in this sample. The table is shown above with the numbers.')}</p>
          {/if}
        </details>
      {/if}
      {#if erg.typ === 'kreuz' && erg.e.zaehlung && erg.e.zaehlung.tab.length === 2 && erg.e.zaehlung.spalten.length === 2}
        {@const z = erg.e.zaehlung}
        {@const rw = erg.e.risiko}
        {#if erg.e.studie === 'fallKontrolle'}
          <p class="heft-text" style="margin-top:var(--a4)">{L('Studiendesign: Fall-Kontroll-Studie. Hier ist nur das Odds Ratio zulässig; Risiken, Risikodifferenz, relatives Risiko und NNT entfallen. Das Design lässt sich in der Frage unter „Weitere Wege“ ändern.', 'Study design: case-control study. Only the odds ratio is permissible here; risks, risk difference, relative risk and NNT do not apply. The design can be changed in the question under "More options".')} <HilfeLink id="risikomasse" text={L('Hilfe: Risikomaße', 'Help: risk measures')} /></p>
        {:else}
        <details class="auf" open={!!rw} style="margin-top:var(--a4)"><summary>{L('Risikomaße berechnen (Risikodifferenz, relatives Risiko, NNT)', 'Calculate risk measures (risk difference, relative risk, NNT)')}</summary>
          <label data-begriff="risikomasse" class="schalter" style="margin-top:var(--a2)"><input type="checkbox" checked={!!rw} onchange={(ev) => { setzeRisiko(ev.currentTarget.checked ? risikoVorschlag(erg.e, 'zeilen') : null); melde(ev.currentTarget.checked ? L('Jetzt gelesen als Vergleich zweier Gruppen.', 'Now read as a comparison of two groups.') : L('Risikomaße ausgeblendet.', 'Risk measures hidden.')); }}>{L('Risikomaße berechnen: eine Spalte nennt die Gruppen, die andere das Ereignis', 'Calculate risk measures: one column names the groups, the other the event')}</label>
          {#if rw}
            {@const gruppenWerte = rw.gruppe === 'zeilen' ? z.zeilen : z.spalten}
            {@const ereignisWerte = rw.gruppe === 'zeilen' ? z.spalten : z.zeilen}
            <div class="korr-wahl" role="radiogroup" aria-labelledby="rk-gr" style="margin-top:var(--a3)">
              <h3 id="rk-gr" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Welche Spalte nennt die Gruppen (Behandlung, Exposition)?', 'Which column names the groups (treatment, exposure)?')}</h3>
              <div class="segment">{#each [['zeilen', erg.e.gruppen], ['spalten', erg.e.gezaehlt]] as [w, tx]}<label><input type="radio" name="rk-gr" value={w} checked={rw.gruppe === w} onchange={() => { setzeRisiko(risikoVorschlag(erg.e, w as 'zeilen' | 'spalten')); melde(L(`Die Gruppen stehen jetzt in: ${tx}.`, `The groups are now in: ${tx}.`)); }}>{tx}</label>{/each}</div>
            </div>
            <div class="korr-wahl" role="radiogroup" aria-labelledby="rk-g1" style="margin-top:var(--a3)">
              <h3 id="rk-g1" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Welche Gruppe wird mit der anderen verglichen (z. B. die behandelte)?', 'Which group is compared with the other (e.g. the treated one)?')}</h3>
              <div class="segment">{#each gruppenWerte as tx, i}<label><input type="radio" name="rk-g1" value={i} checked={rw.gruppePos === i} onchange={() => { setzeRisiko({ ...rw, gruppePos: i as 0 | 1 }); melde(L(`Verglichen wird: ${tx}.`, `Compared: ${tx}.`)); }}>{tx}</label>{/each}</div>
            </div>
            <div class="korr-wahl" role="radiogroup" aria-labelledby="rk-ev" style="margin-top:var(--a3)">
              <h3 id="rk-ev" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Welche Antwort ist das Ereignis (z. B. erkrankt)?', 'Which answer is the event (e.g. fell ill)?')}</h3>
              <div class="segment">{#each ereignisWerte as tx, i}<label><input type="radio" name="rk-ev" value={i} checked={rw.ereignisPos === i} onchange={() => { setzeRisiko({ ...rw, ereignisPos: i as 0 | 1 }); melde(L(`Ereignis ist: ${tx}.`, `Event is: ${tx}.`)); }}>{tx}</label>{/each}</div>
            </div>
            <div class="korr-wahl" role="radiogroup" aria-labelledby="rk-gut" aria-required="true" style="margin-top:var(--a3)">
              <h3 id="rk-gut" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Ist das Ereignis erwünscht? (Pflichtangabe)', 'Is the event desirable? (required)')}</h3>
              <div class="segment">{#each [[true, L('Ja, erwünscht (z. B. genesen)', 'Yes, desirable (e.g. recovered)')], [false, L('Nein, unerwünscht (z. B. erkrankt)', 'No, undesirable (e.g. fell ill)')]] as [w, tx]}<label><input type="radio" name="rk-gut" value={String(w)} checked={rw.erwuenscht === w} onchange={() => { setzeRisiko({ ...rw, erwuenscht: w as boolean }); melde(w ? L('Das Ereignis gilt als erwünscht.', 'The event counts as desirable.') : L('Das Ereignis gilt als unerwünscht.', 'The event counts as undesirable.')); }}>{tx}</label>{/each}</div>
              <p style="color:var(--tinte-2);margin-top:var(--a2)">{rw.erwuenscht === null ? L('Ohne diese Angabe zeigt Statable keine NNT: Davon hängt ab, ob weniger oder mehr Ereignisse ein Nutzen (NNTB) oder ein Schaden (NNTH) sind. Statable rät das nicht.', 'Without this answer Statable shows no NNT: it decides whether fewer or more events are a benefit (NNTB) or a harm (NNTH). Statable does not guess it.') : L('Davon hängt ab, ob weniger oder mehr Ereignisse ein Nutzen (NNTB) oder ein Schaden (NNTH) sind.', 'It decides whether fewer or more events are a benefit (NNTB) or a harm (NNTH).')}</p>
            </div>
            {@const ra = risikoVon(erg.e)}
            {#if ra?.m.nnt && rw.erwuenscht !== null}<p class="heft-text" style="margin-top:var(--a2)"><b>NNT:</b> {nntText(ra.m.nnt).wert} ({nntText(ra.m.nnt).intervall})</p>{/if}
            <p style="color:var(--tinte-2);margin-top:var(--a2)">{L('Risikodifferenz und NNT beschreiben, wie viele Personen mehr oder weniger das Ereignis haben; sie belegen keine Ursache. Das relative Risiko gilt für Kohorten und Experimente. Die Tabelle der Zahlen steht oben.', 'Risk difference and NNT describe how many more or fewer people have the event; they do not show a cause. The relative risk applies to cohorts and experiments. The table of the figures is shown above.')} <HilfeLink id="risikomasse" text={L('Hilfe: Risikomaße', 'Help: risk measures')} /></p>
          {/if}
        </details>
        {/if}
      {/if}
      {#if erg.typ === 'kreuz' && erg.e.zaehlung}<KreuzResiduen e={erg.e} />{/if}
      {#if erg.typ === 'kreuz' && (erg.e.masse || erg.e.schicht)}<KreuzZusatz e={erg.e} onSchicht={setzeSchicht} {melde} />{/if}
      {#if erg.typ === 'kreuz' && erg.e.zaehlung}<KorrespondenzBlock e={erg.e} /><PyramideBlock e={erg.e} />{/if}
      {#if erg.typ === 'zwei-gruppen' && rocText && blatt.gewicht}
        <p class="heft-text" style="margin-top:var(--a4)">{sperrSatz('vorhersage:logistik-roc', blatt.gewicht, L('Die ROC-Kurve', 'The ROC curve'))}</p>
      {:else if erg.typ === 'zwei-gruppen' && rocText}
        <details class="auf" style="margin-top:var(--a4)" ontoggle={(ev) => { if (ev.currentTarget.open) { void rocRechne(); if (blatt && blatt.roc === undefined) { blatt.roc = true; sichern(); } } }}><summary>{L('Trennt die Zahl die beiden Gruppen? (ROC, Fläche unter der Kurve)', 'Does the number separate the two groups? (ROC, area under the curve)')}</summary>
          <p class="heft-text" style="margin:var(--a2) 0">{L(`Wenn ${name(erg.e.abhaengig)} die Gruppen unterscheiden soll (z. B. Screening-Punkte gegen eine Diagnose), zeigt die Fläche unter der ROC-Kurve (AUC) die Trefferwahrscheinlichkeit: Wie oft hat eine zufällig gezogene Person aus der Gruppe „${rocText.positiv}“ den höheren Wert als eine aus der anderen Gruppe? ,50 heißt Zufall, 1 heißt vollständige Trennung. Positiv ist hier „${rocText.positiv}“, hohe Werte sprechen dafür.`, `If ${name(erg.e.abhaengig)} is meant to tell the groups apart (e.g. screening scores against a diagnosis), the area under the ROC curve (AUC) is the probability of a correct ranking: how often does a randomly drawn person from the group "${rocText.positiv}" have a higher value than one from the other group? .50 means chance, 1 means complete separation. Positive here is "${rocText.positiv}", high values point to it.`)}</p>
          {#if roc?.schluessel === (blatt?.id ?? '') + rocText.befehl && roc.a}
            {@const a = roc.a}
            <p class="heft-text"><b>AUC = {ohneNull(a.auc)}, {ki(ohneNull(a.lo), ohneNull(a.hi))}, p {pWert(a.p)}</b></p>
            <p style="color:var(--tinte-2);margin-top:var(--a2)">{a.begrenzt
              ? L(`Fläche, Standardfehler (${ohneNull(a.se, 3)}) und p kommen aus PSPP; das Intervall ist Fläche ± 1,96 · Standardfehler und bei 0 bzw. 1 begrenzt. R (pROC, DeLong) liefert einen leicht anderen Standardfehler, das Intervall weicht entsprechend etwas ab. Bei kleinen Gruppen ist es ungenau.`, `Area, standard error (${ohneNull(a.se, 3)}) and p come from PSPP; the interval is area ± 1.96 · standard error and limited to 0 and 1. R (pROC, DeLong) gives a slightly different standard error, so the interval differs a little. It is imprecise for small groups.`)
              : L(`Fläche, Standardfehler (${ohneNull(a.se, 3)}) und p kommen aus PSPP; das Intervall ist Fläche ± 1,96 · Standardfehler. R (pROC, DeLong) liefert einen leicht anderen Standardfehler, das Intervall weicht entsprechend etwas ab. Bei kleinen Gruppen ist es ungenau.`, `Area, standard error (${ohneNull(a.se, 3)}) and p come from PSPP; the interval is area ± 1.96 · standard error. R (pROC, DeLong) gives a slightly different standard error, so the interval differs a little. It is imprecise for small groups.`)}</p>
          {:else if roc?.schluessel === (blatt?.id ?? '') + rocText.befehl}<p style="color:var(--tinte-2)">{L('Die Fläche ließ sich nicht berechnen (zu wenige Werte in einer Gruppe).', 'The area could not be calculated (too few values in one group).')}</p>
          {:else}<p style="color:var(--tinte-2)"><Rechnet text={L('Statable rechnet …', 'Statable is calculating …')} /> <Abbrechen aktiv={true} /></p>{/if}
          {#if rocDaten}
            {@const k = rocDaten}
            <DiagrammExport titel={`${name(erg.e.abhaengig)} - ${L('ROC-Kurve', 'ROC curve')}`}><Rocdiagramm {k} titel={name(erg.e.abhaengig)} positiv={rocText.positiv} /></DiagrammExport>
            <label data-begriff="roc-kurve" class="schalter" style="margin-top:var(--a2)"><input type="checkbox" checked={!!blatt.roc} onchange={(ev) => { blatt!.roc = ev.currentTarget.checked; sichern(); melde(blatt!.roc ? L('Die ROC-Kurve kommt in den Bericht.', 'The ROC curve goes into the report.') : L('Die ROC-Kurve kommt nicht in den Bericht.', 'The ROC curve does not go into the report.')); }}>{L('ROC-Kurve im Bericht zeigen', 'Show the ROC curve in the report')}</label>
            <p class="heft-text" style="margin-top:var(--a2)"><b>{L(`Bester Schwellenwert: ${komma(k.beste.schwelle, Number.isInteger(k.beste.schwelle) ? 0 : 2)} oder mehr`, `Best cut-off: ${komma(k.beste.schwelle, Number.isInteger(k.beste.schwelle) ? 0 : 2)} or more`)}</b> ({L('Youden-Index', 'Youden index')} J = {ohneNull(k.beste.j)}). {L(`Wer diesen Wert oder mehr hat, gilt als „${rocText.positiv}“. Damit werden ${komma(k.beste.sens * 100, 0)} % der Personen mit „${rocText.positiv}“ erkannt (Sensitivität) und ${komma(k.beste.spez * 100, 0)} % der anderen richtig als nicht „${rocText.positiv}“ eingestuft (Spezifität).`, `Anyone at or above this value counts as "${rocText.positiv}". This catches ${komma(k.beste.sens * 100, 0)}% of the people with "${rocText.positiv}" (sensitivity) and correctly classifies ${komma(k.beste.spez * 100, 0)}% of the others as not "${rocText.positiv}" (specificity).`)}</p>
            <p style="color:var(--tinte-2);margin-top:var(--a2)">{L('Der Schwellenwert ist an genau diesen Daten gewählt, nämlich dort, wo Sensitivität und Spezifität zusammen am größten sind. In neuen Daten schneidet er meist schlechter ab. Ob eher Sensitivität oder Spezifität zählt, hängt von der Folge eines Fehlers ab - das kann der Youden-Index nicht wissen.', 'The cut-off is chosen on exactly these data, where sensitivity and specificity together are largest. In new data it usually does worse. Whether sensitivity or specificity matters more depends on the cost of an error - the Youden index cannot know that.')}</p>
          {/if}
          <div class="knopfzeile" style="margin-top:var(--a2)"><button class="k leise" type="button" onclick={() => { merkeSyntax(rocText.befehl, L('ROC-Kurve', 'ROC curve')); location.hash = 'befehle'; }}><Icon n="befehl" />{L('Kurve und Schwellen in den Befehlen öffnen', 'Open curve and cut-offs in Commands')}</button></div>
        </details>
      {/if}
      {#if erg.typ === 'skala' && skalaFragen.length >= 3 && skalaFragen.length === erg.e.fragen.length}<RaschBlock fragen={skalaFragen} {name} /><Irt2plBlock fragen={skalaFragen} {name} /><MdsBlock fragen={skalaFragen} {name} /><GrmBlock fragen={skalaFragen} {name} /><DifBlock fragen={skalaFragen} {name} />{/if}
      {#if erg.typ === 'skala' && skalaFragen.length === erg.e.fragen.length}<OmegaZeile blatt={blatt!} e={erg.e} fragen={skalaFragen} umpolen={umzupolen.length > 0} />{/if}
      {#if erg.typ === 'skala' && skalaFragen.length === erg.e.fragen.length && !blatt?.gewicht}<SplitHalfBlock blatt={blatt!} e={erg.e} fragen={skalaFragen} umpolen={umzupolen.length > 0} {name} />{/if}
      {#if erg.typ === 'skala' && skalaFragen.length >= 3 && skalaFragen.length === erg.e.fragen.length && !blatt?.gewicht}<KlassenBlock spalten={skalaFragen} />{/if}
      {#if erg.typ === 'skala' && skalaFragen.length >= 3 && skalaFragen.length === erg.e.fragen.length && !blatt?.gewicht}<DelphiBlock spalten={skalaFragen} /><QBlock spalten={skalaFragen} /><ConceptBlock spalten={skalaFragen} />{/if}
      {#if erg.typ === 'faktor' && !blatt?.gewicht && (blatt?.l3?.length ?? 0) >= 3}<FaktorKmoBlock fragen={blatt!.l3!} {name} />{/if}
{/if}
      {#if !(erg?.typ === 'mcnemar' || erg?.typ === 'cochran' || rangBlatt?.art === 'friedman') && !(mfListe.length && !blatt.items.length)}{#if weitereAusgabe.length}<details class="auf" open={s.einst.profi}><summary>{L('Weitere Auswertungen', 'More results')}</summary><Ausgabe items={weitereAusgabe} /></details>{/if}{/if}
{#if saetze && erg}<WeiterMitListe typ={erg.typ} gruppe="genauer" mehrere={erg.typ !== 'vorhersage' || erg.e.df1 >= 2} />{/if}
      </div></div>
    <div class="wm-gruppe" role="group" aria-labelledby="wm-g-anders"><h3 id="wm-g-anders">{L('Anders rechnen', 'Calculate differently')}</h3>
      {#if !s.einst.profi}<p class="wm-satz">{L('Dieselbe Frage mit einem anderen Verfahren, zum Beispiel ohne Annahme einer Normalverteilung.', 'The same question with another method, for example without assuming a normal distribution.')}</p>{/if}
      <div class="wm-inhalt">
{#if saetze && erg}
      {#if erg.typ === 'zwei-gruppen'}<MatchingBlock {blatt} e={erg.e} />{/if}
      {#if erg.typ === 'zwei-gruppen' || erg.typ === 'prae-post'}<BlattZusatz {blatt} tost={erg.tost} rci={erg.typ === 'prae-post' ? erg.rci : undefined} {name} paired={erg.typ === 'prae-post'} einstellen={editorDa && verfahren ? zuWeitereWege : undefined} />{/if}
      {#if blatt.zus?.zufall?.an && (erg.typ === 'zwei-gruppen' || erg.typ === 'zusammenhang' || erg.typ === 'vorhersage' || erg.typ === 'verteilung')}<BlattZufall {blatt} {name} {neuerStartwert} mitTabellen={erg.typ === 'vorhersage'} />{/if}
      {#if erg.typ === 'mehrebenen'}<MehrebenenModelle {blatt} e={erg.e} />{/if}
      {#if erg.typ === 'verteilung'}<ImputationBlock />{/if}
      {#if erg.typ === 'anova2'}<Anova3Block e={erg.e} {name} /><BayesMehrBlock e={erg.e} {name} />{/if}
      {#if erg.typ === 'vorhersage' && !blatt?.gewicht && werte.l1[0]}<RobustBlock terme={regTerme(werte.l2, ctx.faktor)} ziel={werte.l1[0]} {name} />{/if}
      {#if erg.typ === 'vorhersage'}<BaumBlock /><KnnBlock /><PanelBlock /><IvBlock /><DidBlock /><RdBlock />{/if}
      {#if erg.typ === 'korrmatrix' && erg.e.spalten.length >= 3}<NetzBlock spalten={erg.e.spalten} methode={erg.e.methode} />{/if}
      {#if erg.typ === 'cluster' && erg.e.gerechnet.length >= 2}<ProfilBlock spalten={erg.e.gerechnet} />{/if}
      {#if erg.typ === 'messwiederholung' && !erg.e.gruppenSpalte && !rangBlatt && erg.e.zeitpunkte.length >= 3}<WachstumBlock spalten={erg.e.zeitpunkte} {name} />{/if}
      {#if erg.typ === 'faktor' && blatt?.l3?.length}<KonfirmatorischeFa blatt={blatt} e={erg.e} fragen={blatt.l3} {name} />{/if}
<WeiterMitListe typ={erg.typ} gruppe="anders" mehrere={erg.typ !== 'vorhersage' || erg.e.df1 >= 2} />
{/if}
      </div></div>
    <div class="wm-gruppe" role="group" aria-labelledby="wm-g-naechste"><h3 id="wm-g-naechste">{L('Nächste Frage', 'Next question')}</h3>
      {#if !s.einst.profi}<p class="wm-satz">{L('Eine neue Auswertung, die auf diesem Ergebnis aufbaut.', 'A new analysis that builds on this result.')}</p>{/if}
      <div class="wm-inhalt">
{#if saetze && erg}
      {#if erg.typ === 'skala' && skalaFragen.length === erg.e.fragen.length}
        <div class="skala-weiter" role="group" aria-labelledby="sw-t" style="margin-top:var(--a5)">
          <h4 id="sw-t">{L('Weiter mit der Skala', 'Next steps with the scale')}</h4>
          {#if gemerkteSkala}<p class="heft-text" style="margin:var(--a2) 0">{L(`Diese Fragen sind als Skala „${gemerkteSkala.name}“ festgelegt.`, `These questions are defined as the scale "${gemerkteSkala.name}".`)} <a href="#spalten">{L('Skalen ändern', 'Change scales')}</a></p>
          {:else}<form class="sw-form" onsubmit={skalaMerken} novalidate>
              <div class="eingabe"><label for="sm-name">{L('Als Skala merken (Name wie im Handbuch)', 'Remember as a scale (name as in the manual)')}</label>
                <input id="sm-name" type="text" bind:value={smName} placeholder={L('z. B. Organisation', 'e.g. Organization')} autocomplete="off" aria-invalid={smFehler ? 'true' : undefined} aria-describedby="sm-t"></div>
              <button class="k" type="submit">{L('Skala merken', 'Remember scale')}</button>
            </form>
            <p id="sm-t" class="heft-text" style="max-width:68ch;margin:var(--a2) 0 var(--a4);color:{smFehler ? 'var(--fehler, var(--tinte))' : 'var(--tinte-2)'}" role={smFehler ? 'alert' : undefined}>{smFehler || (erg?.typ === 'skala' && erg.e.alpha < 0.7 ? d('Die Zuverlässigkeit ist niedrig. Merke die Fragen nur als Skala, wenn sie so im Handbuch des Fragebogens stehen - nicht, weil sie gut zusammenpassen könnten.', 'Die Zuverlässigkeit ist niedrig. Merken Sie die Fragen nur als Skala, wenn sie so im Handbuch des Fragebogens stehen - nicht, weil sie gut zusammenpassen könnten.', 'Reliability is low. Only remember the questions as a scale if the questionnaire manual defines them like this - not because they might fit together.') + ' ' : '') + d('Dann stehen die Fragen in jeder neuen Auswertung unter diesem Namen beisammen und gehen als Variablenset in den SPSS-Export.', 'Dann stehen die Fragen in jeder neuen Auswertung unter diesem Namen beisammen und gehen als Variablenset in den SPSS-Export.', 'The questions are then grouped under this name in every new analysis and go into the SPSS export as a variable set.')}</p>{/if}
          {#if umzupolen.length}
            {#each umzupolen as n (n)}
              {@const r = umgepolteSpalte(n)}
              <p class="heft-text" style="margin:var(--a2) 0">{#if r}{L(`${n} ist umgepolt: Spalte ${r}.`, `${n} is reverse-coded: column ${r}.`)}{:else}{d(`${name(n)} läuft gegen die anderen Fragen. Umpolen heißt: Statable legt eine neue Spalte ${n}R an, in der die Antworten umgedreht sind. ${n} bleibt, wie sie ist.`, `${name(n)} läuft gegen die anderen Fragen. Umpolen heißt: Statable legt eine neue Spalte ${n}R an, in der die Antworten umgedreht sind. ${n} bleibt, wie sie ist.`, `${name(n)} runs against the other questions. Reverse-coding means: Statable creates a new column ${n}R with the answers turned around. ${n} stays as it is.`)}{/if}</p>
            {/each}
            {#if umzupolen.some(n => !umgepolteSpalte(n)) && umpolVorschlag}
              <p class="umpol-spanne heft-text"><label>{L('Antworten gehen von', 'Answers range from')} <input type="number" step="1" value={umpolFest.min} oninput={(e) => { const v = (e.currentTarget as HTMLInputElement).valueAsNumber; umpolVon = Number.isFinite(v) ? v : null; }}></label>
                <label>{L('bis', 'to')} <input type="number" step="1" value={umpolFest.max} oninput={(e) => { const v = (e.currentTarget as HTMLInputElement).valueAsNumber; umpolBis = Number.isFinite(v) ? v : null; }}></label>
                <span style="color:var(--tinte-2)">{L(`Aus ${umpolFest.max} wird ${umpolFest.min}. Stimmt die Spanne nicht (z. B. hat niemand die höchste Antwort gewählt), hier ändern.`, `${umpolFest.max} becomes ${umpolFest.min}. If the range is wrong (e.g. nobody chose the highest answer), change it here.`)}</span></p>
            {/if}
            <div class="knopfzeile">
              {#each umzupolen.filter(n => !umgepolteSpalte(n)) as n (n)}<button class="k haupt" type="button" aria-disabled={s.arbeitet ? 'true' : undefined} onclick={() => umpolen(n)}><Icon n="rueck" />{L(`Frage ${n} umpolen`, `Reverse-code ${n}`)}</button>{/each}
              {#if umzupolen.every(n => umgepolteSpalte(n))}<button class="k haupt" type="button" aria-disabled={rechnet ? 'true' : undefined} onclick={mitUmgepolten}>{L(`Neu rechnen mit ${umzupolen.map(n => umgepolteSpalte(n)).join(', ')}`, `Recalculate with ${umzupolen.map(n => umgepolteSpalte(n)).join(', ')}`)}</button>{/if}
            </div>
            <p style="color:var(--tinte-2);margin-top:var(--a2)">{d('Den Skalenwert bildest du danach - mit den umgepolten Fragen.', 'Den Skalenwert bilden Sie danach - mit den umgepolten Fragen.', 'You create the scale score afterwards - with the reverse-coded questions.')}</p>
          {:else}
            <p class="heft-text" style="margin:var(--a2) 0">{d(`Der Skalenwert ist der Mittelwert der ${skalaFragen.length} Fragen je Person (${skalaFragen.join(', ')}). Damit kannst du weiterrechnen, etwa in einer Vorhersage.`, `Der Skalenwert ist der Mittelwert der ${skalaFragen.length} Fragen je Person (${skalaFragen.join(', ')}). Damit können Sie weiterrechnen, etwa in einer Vorhersage.`, `The scale score is the mean of the ${skalaFragen.length} questions for each person (${skalaFragen.join(', ')}). You can use it in further calculations, such as a prediction.`)}</p>
            <form class="sw-form" onsubmit={skalenwertAnlegen} novalidate>
              <div class="eingabe"><label for="sw-name">{L('Name der neuen Spalte', 'Name of the new column')}</label>
                <input id="sw-name" type="text" bind:value={swName} placeholder={swVorschlag} autocomplete="off" spellcheck="false" aria-invalid={swFehler ? 'true' : undefined} aria-describedby={swFehler ? 'sw-fehler' : undefined}>
                {#if swFehler}<p id="sw-fehler" class="hilfe" role="alert">{swFehler}</p>{/if}</div>
              {#if swLuecke > 0}<div class="eingabe"><label for="sw-min">{L(`Mindestens beantwortet (von ${skalaFragen.length} Fragen)`, `Answered at least (of ${skalaFragen.length} questions)`)}</label>
                <input id="sw-min" type="number" min="1" max={skalaFragen.length} step="1" bind:value={() => swMin, v => (swMinEigen = Number(v) || 1)} style="max-width:8ch" aria-describedby="sw-min-t">
                <p id="sw-min-t" class="hilfe">{Lp(swLuecke, `${swLuecke} Person hat nicht alle Fragen beantwortet; ihr Wert ist der Mittelwert der beantworteten.`, `${swLuecke} Personen haben nicht alle Fragen beantwortet; ihr Wert ist der Mittelwert der beantworteten.`, `${swLuecke} person did not answer all questions; their score is the mean of the answered ones.`, `${swLuecke} people did not answer all questions; their score is the mean of the answered ones.`)} {swMin > 1 ? L(`${swOhne} davon bekommen keinen Wert, weil sie weniger als ${swMin} beantwortet haben.`, `${swOhne} of them get no score because they answered fewer than ${swMin}.`) : L('Oft verlangt man, dass mindestens 80 % beantwortet sind.', 'A common rule is that at least 80% must be answered.')}</p></div>{/if}
              <button class="k haupt" type="submit" aria-disabled={s.arbeitet ? 'true' : undefined}><Icon n="plus" />{L('Skalenwert als neue Spalte anlegen', 'Create scale score as a new column')}</button>
            </form>
            {#if swFertig && s.spalten.some(x => x.name === swFertig)}<p role="status" style="margin-top:var(--a2)">{L(`Spalte ${swFertig} angelegt.`, `Column ${swFertig} created.`)} <a href="#daten">{L('Zu den Daten', 'To the data')}</a> · <a href="#blatt/neu">{L('Neue Auswertung starten', 'Start a new analysis')}</a></p>{/if}
          {/if}
        </div>
      {/if}
      {#if erg.typ === 'faelle'}<QcaBlock />{/if}
      {#if erg.typ === 'verteilung' && !erg.e.mehrfach?.length}<BlattEinstichprobe {blatt} e={erg.e} {melde} />{/if}
      {#if erg.typ === 'anova2'}<MesssystemBlock e={erg.e} {name} ziel={kursZielFrisch(blatt, 'messsystem')} />{/if}
      {#if erg.typ === 'vorhersage' || erg.typ === 'mediation'}<PfadBlock />{/if}
      {#if erg.typ === 'prae-post'}
        {@const e = erg.e}
        {#if ancovaKandidaten.length}
          <details class="auf" style="margin-top:var(--a3)"><summary>{L('Gibt es eine Kontroll- und eine Versuchsgruppe?', 'Is there a control group and an intervention group?')}</summary>
            <p class="heft-text" style="margin:var(--a2) 0">{L('Dann vergleicht eine Kovarianzanalyse (ANCOVA) die Gruppen beim Nachher-Wert und berücksichtigt dabei den Vorher-Wert als Kontrollvariable. Statable rechnet sie unter „Unterscheiden sich Gruppen?“, mit adjustierten Mittelwerten und dem Test auf gleiche Steigungen.', 'Then an analysis of covariance (ANCOVA) compares the groups on the after value and takes the before value into account as a control variable. Statable calculates it under "Do groups differ?", with adjusted means and the test of equal slopes.')}</p>
            <div class="knopfzeile">{#each ancovaKandidaten as k (k)}<button class="k" type="button" onclick={() => zurAncova(e.vorher, e.nachher, k)}>{L(`Kovarianzanalyse mit „${name(k)}“`, `Analysis of covariance with "${name(k)}"`)}</button>{/each}</div>
          </details>
        {/if}
      {/if}
<WeiterMitListe typ={erg.typ} gruppe="naechste" mehrere={erg.typ !== 'vorhersage' || erg.e.df1 >= 2} />
{/if}
<p class="wm-neu"><a href="#blatt/neu">{L('Eine andere Frage an dieselben Daten (Neue Auswertung)', 'Another question about the same data (new analysis)')}</a></p>
      </div></div>
  </div></section>
  {/if}

  <section use:weich class="feld" aria-label={L('Schritt 4', 'Step 4')}><span class="nr fertig" aria-hidden="true"><Icon n="haken" /></span><div><h2 id="f4-t" tabindex="-1">{d('Für deine Arbeit', 'Für Ihre Arbeit', 'For your paper')}</h2><div class="feld-inhalt">
    <div class="ergebnis-spalten">
    {#if saetze?.apa && !fehlt.length}<div class="apa-zeile"><span><Kursiv text={saetze.apa} /></span><button class="k" type="button" data-tipp={L('Kopiert die Zeile für die Arbeit (APA), mit kursiven Zeichen für Word', 'Copies the line for your paper (APA), with italics for Word')} onclick={() => kopiereApa(saetze!.apa)}><Icon n="kopieren" />{L('Kopieren', 'Copy')}</button></div>
      {#if mwTabellen}<Ausgabe items={mwTabellen.haupt} nurTabellen /><details class="auf"><summary>{L('Weitere Tabellen', 'More tables')}</summary><Ausgabe items={mwTabellen.rest} nurTabellen /></details>
      {:else if !tabellenImErgebnis}<Ausgabe items={erg?.typ === 'kappa' ? berichtTabellenVorschlag(blatt!).filter(i => !i.cells.some(c => c.t === 'Count') && !/^Intercoder/.test(i.label)) : berichtTabellenVorschlag(blatt!)} nurTabellen />{/if}{/if}
    {#if !fehlt.length && !blatt.gesperrt}   <!-- Spalte entfernt (D12): keine alten Zahlen, Tabellen, Befehle oder Export; Notiz und „Blatt entfernen“ bleiben -->
    <div class="knopfzeile" style="margin:var(--a3) 0"><ExportMenue eintraege={blattExport} name={`${L('ganzes Blatt', 'whole page')}: ${blatt.titel}`} /></div>
    {#if eigenNotiz(blatt.art, erg?.typ, rangBlatt?.art === 'friedman')}<p class="heft-text" style="margin:var(--a3) 0">{eigenNotiz(blatt.art, erg?.typ, rangBlatt?.art === 'friedman')}</p>
    {#if erg?.typ === 'mcnemar' || erg?.typ === 'cochran' || rangBlatt?.art === 'friedman'}{@const bf = rangBlatt?.art === 'friedman' ? rangBefehl(rangBlatt) : blatt.syntax}
      <details class="auf" open={s.einst.profi}><summary>{L('Befehl', 'Command')}</summary><pre class="befehl">{bf}</pre>
        <button class="k leise" type="button" onclick={() => { merkeSyntax(bf, rangBlatt ? rangTestName(rangBlatt) : blatt!.titel); location.hash = 'befehle'; }}><Icon n="befehl" />{L('In den Befehlen öffnen', 'Open in Commands')}</button></details>{/if}
    {:else if mfListe.length && !blatt.items.length}<p class="heft-text" style="margin:var(--a3) 0">{L('Statable rechnet Mehrfachantworten selbst (PSPP 2.1.3 kennt MULT RESPONSE nicht), nach der Logik von SPSS MRSETS und MULT RESPONSE. Die Zahlen sind gegen eine Rechnung in R geprüft.', 'Statable calculates multiple responses itself (PSPP 2.1.3 does not know MULT RESPONSE), following the logic of SPSS MRSETS and MULT RESPONSE. The numbers are checked against a calculation in R.')}</p>
    {:else}
    {#if blatt.art === 'mediation' || blatt.art === 'moderation'}<p class="heft-text" style="margin:var(--a3) 0">{blatt.art === 'mediation' ? L('Die Pfade rechnet PSPP; den indirekten Effekt mit Bootstrap-Intervall rechnet Statable selbst (Art des Intervalls, Ziehungen und Startwert stehen unter der Tabelle). Zahlen gegen R (lm, lavaan, boot) geprüft.', 'PSPP calculates the paths; Statable itself calculates the indirect effect with its bootstrap interval (type of interval, draws and seed are given below the table). Numbers checked against R (lm, lavaan, boot).') : L('Die Regressionen rechnet PSPP; einfache Steigungen und Johnson-Neyman rechnet Statable aus den Koeffizienten. Zahlen gegen R (lm, interactions) geprüft.', 'PSPP calculates the regressions; Statable calculates simple slopes and Johnson-Neyman from the coefficients. Numbers checked against R (lm, interactions).')}</p>{/if}
    {#if erg?.typ === 'anova2'}<p class="heft-text" style="margin:var(--a3) 0">{L('PSPP rechnet die Tabelle der Quadratsummen vom Typ III (GLM); Zellmittelwerte, Effektstärken mit Intervall, einfache Effekte und das Diagramm rechnet Statable aus den Daten und dem Fehlerterm des Gesamtmodells. Zahlen gegen R (car, afex, emmeans, effectsize) geprüft.', 'PSPP calculates the table of Type III sums of squares (GLM); Statable calculates cell means, effect sizes with intervals, simple effects and the chart from the data and the error term of the whole model. Numbers checked against R (car, afex, emmeans, effectsize).')}</p>{/if}
    {#if erg?.typ === 'hierreg'}<p class="heft-text" style="margin:var(--a3) 0">{L('PSPP rechnet je Block ein Modell (ENTER) auf denselben Fällen; ΔR², F-Änderung und p rechnet Statable daraus, wie SPSS „F Change“. Zahlen gegen R (lm, anova) geprüft.', 'PSPP calculates one model per block (ENTER) on the same cases; Statable calculates ΔR², F change and p from them, as SPSS "F Change". Numbers checked against R (lm, anova).')}</p>{/if}
    {#if erg?.typ === 'ancova'}<p class="heft-text" style="margin:var(--a3) 0">{L('PSPP kennt bei GLM keine Kovariate. PSPP rechnet vier Regressionen mit denselben Personen; Gruppentest, adjustierte Mittelwerte, Paarvergleiche und den Test der Steigungen rechnet Statable daraus. Zahlen gegen R (car, emmeans) geprüft.', 'PSPP has no covariate in GLM. PSPP runs four regressions with the same people; Statable calculates the group test, adjusted means, pairwise comparisons and the test of the slopes from them. Numbers checked against R (car, emmeans).')}</p>{/if}
    {#if blatt.art === 'korrmatrix'}<p class="heft-text" style="margin:var(--a3) 0">{L('Statable rechnet die Matrix selbst (Pearson und Spearman, Lücken paarweise); die Zahlen sind gegen R (cor.test, p.adjust) geprüft. PSPP liefert unter „Weiter mit …“, „Weitere Auswertungen“ die Pearson-Werte zum Vergleich.', 'Statable calculates the matrix itself (Pearson and Spearman, missing values pairwise); the numbers are checked against R (cor.test, p.adjust). PSPP gives the Pearson values for comparison under "Next steps …", "More results".')}</p>{/if}
    <details class="auf" open={s.einst.profi}><summary>{L('Befehl', 'Command')}</summary><pre class="befehl">{blatt.syntax}</pre>
      {#if rangBlatt}{@const rb = rangBefehl(rangBlatt, blatt.syntax)}<p class="heft-text" style="margin:var(--a2) 0">{istWeitere(rangBlatt) ? (rangBlatt.art === 'jt' || rangBlatt.art === 'ks' ? L('Diesen Rangtest rechnet Statable selbst; PSPP rechnet ihn nicht oder bei gleichen Werten falsch:', 'Statable calculates this rank test itself; PSPP does not calculate it, or calculates it wrongly with tied values:') : L('Diesen Rangtest rechnet Statable selbst (Fisher-exakt und Binomialtest exakt); PSPP liefert mit diesem Befehl die Häufigkeiten und die Näherung:', 'Statable calculates this rank test itself (Fisher exact and exact binomial test); PSPP gives the frequencies and the approximation with this command:')) : L('Den Rangtest rechnet Statable selbst; PSPP liefert mit diesem Befehl dieselben Werte (U, z bzw. H, df und p):', 'Statable calculates the rank test itself; PSPP gives the same values (U, z or H, df and p) with this command:')}</p><pre class="befehl">{rb}</pre>
        <button class="k leise" type="button" onclick={() => { merkeSyntax(rb, rangTestName(rangBlatt)); location.hash = 'befehle'; }}><Icon n="befehl" />{L('Rangtest in den Befehlen öffnen', 'Open the rank test in Commands')}</button>{/if}
      <button class="k leise" type="button" onclick={() => { merkeSyntax(blatt!.syntax, blatt!.titel); location.hash = 'befehle'; }}><Icon n="befehl" />{L('In den Befehlen bearbeiten', 'Edit in Commands')}</button></details>
    {/if}
    {/if}
    <details class="auf"><summary>{L('Notiz und Blatt', 'Note and page')}</summary>
      <div class="eingabe" style="margin:var(--a2) 0"><label for="notiz">{d('Deine Notiz (kommt in den Bericht)', 'Ihre Notiz (kommt in den Bericht)', 'Your note (goes into the report)')}</label><textarea id="notiz" bind:value={blatt.notiz} oninput={() => sichern()}></textarea></div>
      <button class="k leise" type="button" onclick={loeschen}>{L('Blatt entfernen', 'Remove page')}</button></details>
  </div></div></div></section>
</article><Rand bind:schluessel={randKey} {extra} kontext={randKontext} /></div>

{:else}
<div class="tisch ohne-rand"><div class="leer-zustand"><Icon n="blatt" k="gross" /><h1>{L('Dieses Blatt gibt es nicht mehr', 'This page no longer exists')}</h1><p>{d('Vielleicht hast du es entfernt.', 'Vielleicht haben Sie es entfernt.', 'Maybe you removed it.')}</p><a class="k haupt" href="#blatt/neu">{L('Neue Auswertung starten', 'Start a new analysis')}</a></div></div>
{/if}
