import { describe, it, expect } from 'vitest';
import { artikelListe, type Block } from './artikel';
import { suche } from './suche';
import { klumpenFrage } from '../lib/gewichte';
import { VERFAHREN } from '../lib/verfahren';
import { ASSISTENTEN } from '../lib/datenassistenten';
import { s as sitzung } from '../lib/sitzung.svelte';

/* Pakete B und E (Ausbessern 18.10.): Fachsätze aus dem SPSS-Vergleich in der Hilfe, Seite „SPSS-Menü → Statable“, Suchwörter. Wortlaut: Satzdatei von Opus. */
const de = artikelListe('de'), en = artikelListe('en');
const text = (l: typeof de, id: string) => { const a = l.find(x => x.id === id); expect(a, id).toBeDefined(); return a!.inhalt.map((b: Block) => typeof b === 'string' ? b : 'h' in b ? b.h : 'ul' in b ? b.ul.join(' ') : 'ol' in b ? b.ol.join(' ') : 'code' in b ? b.code : 'apa' in b ? b.apa : '').join(' '); };
const ids = (q: string, l = de) => suche(l, q).map(t => t.artikel.id);

/** [Artikel, deutscher Satz (oder Teil), englischer Satz (oder Teil)] */
const SAETZE: [string, string, string][] = [
  ['mantel-haenszel', '„Cochran“ ist eine eigene Formel (teilt je Schicht durch n statt durch n - 1)', '"Cochran" is a separate formula (it divides by n instead of n - 1 in each stratum)'],
  ['mantel-haenszel', 'mit Korrektur 1,4269 (SPSS 1,427), ohne Korrektur 1,5246; SPSS „Cochran“ 1,527', 'with correction 1.4269 (SPSS 1.427), without correction 1.5246; SPSS "Cochran" 1.527'],
  ['sterbetafel', 'Statable rechnet den Test nach Gehan ungefähr: Jede Zeit zählt als Anfang ihres Intervalls (in SPSS: /CALCULATE=APPROXIMATE, dort gleich). Ohne diese Angabe rechnet SPSS exakt; darum können die Zahlen abweichen (Beispiel lung nach Geschlecht: hier 13,528, SPSS exakt 12,777).', 'Statable computes the Gehan test approximately: each time counts as the start of its interval (in SPSS: /CALCULATE=APPROXIMATE, which gives the same). Without this option SPSS computes it exactly, so the numbers can differ (example lung by sex: here 13.528, SPSS exact 12.777).'],
  ['quantilregression', 'Die Schätzwerte sind dieselben wie in SPSS und R (quantreg). Standardfehler und Intervalle können von SPSS abweichen: SPSS schätzt sie über die Dichte (IID oder NID), Statable über Bootstrap, nid-Näherung oder Rang-Umkehr.', 'The estimates are the same as in SPSS and R (quantreg). Standard errors and intervals can differ from SPSS: SPSS estimates them via the density (IID or NID), Statable via bootstrap, the nid approximation or rank inversion.'],
  ['frage-cluster', 'Statable sucht mit 25 Starts die Lösung mit der kleinsten Streuung; SPSS nimmt einen Start und kann bei einer schlechteren Lösung stehen bleiben. Statable rechnet außerdem mit z-Werten, SPSS mit Rohwerten. Darum können Gruppen und Größen verschieden sein.', 'Statable uses 25 starts and keeps the solution with the smallest spread; SPSS uses one start and can stop at a worse solution. Statable also works with z values, SPSS with raw values. So groups and their sizes can differ.'],
  ['befehle-seite', 'QUICK CLUSTER im Befehlsfeld rechnet PSPP. PSPP wählt andere Anfangszentren als SPSS und zeigt sie an; die Endzentren sind gleich.', 'QUICK CLUSTER on the commands page is computed by PSPP. PSPP picks different initial centres than SPSS and shows them; the final centres are the same.'],
  ['sterbetafel', 'Wird der Median nicht erreicht, zeigt SPSS den Anfang des letzten Intervalls als Zahl; Statable schreibt „nicht erreicht“. Im offenen letzten Intervall zeigt SPSS Dichte und Hazard als 0; Statable lässt sie leer, weil das Intervall keine Breite hat.', 'If the median is not reached, SPSS shows the start of the last interval as a number; Statable writes "not reached". In the open last interval SPSS shows density and hazard as 0; Statable leaves them empty because the interval has no width.'],
  ['fallgewichte', 'Den Design-Effekt rechnet Statable ohne Endlichkeitskorrektur (wie R survey mit deff = "replace"). SPSS korrigiert für die Endlichkeit und zeigt etwas mehr (Beispiel apistrat: 1,210 gegen SPSS 1,250).', 'Statable computes the design effect without finite population correction (as R survey with deff = "replace"). SPSS corrects for the finite population and shows somewhat more (example apistrat: 1.210 versus SPSS 1.250).'],
  ['frage-zeitreihen', 'Additiv ist die Zerlegung gleich wie in SPSS. Multiplikativ weichen die Saisonfaktoren bis 0,4 % ab (anderes Verfahren). Den Trend glättet SPSS bis an die Ränder; bei Statable fehlt er je eine halbe Periode am Anfang und am Ende (wie R decompose).', 'The additive decomposition is the same as in SPSS. In the multiplicative one the seasonal factors differ by up to 0.4% (different method). SPSS smooths the trend up to the edges; in Statable it is missing for half a period at the start and at the end (as in R decompose).'],
  ['frage-cluster', 'Bei Ward wird die Höhe der Zusammenlegung angezeigt (wie R), nicht der aufsummierte Koeffizient aus SPSS. Die Zuordnung der Fälle ist gleich.', 'For Ward the height of each merge is shown (as in R), not the cumulative coefficient from SPSS. The assignment of the cases is the same.'],
  ['befehle-seite', 'Statable führt PSPP-Befehle aus, keine SPSS-Skripte: Eine .sps-Datei läuft auf der Seite „Befehle“, soweit PSPP die Befehle kennt; Python-Programme und SPSS-Erweiterungen laufen nicht. Beim Import eines Fragebogens mit Kodebuch (Dialog „Fragebogen erkannt“, „Kodebuch dazu“) übernimmt Statable aus einer .sps nur Beschriftungen, fehlende Werte und Daten und überspringt alle anderen Befehle. GLM mit WITH (Kovarianzanalyse) und NONPAR CORR (Spearman) kann PSPP nicht;', 'Statable runs PSPP commands, not SPSS scripts: an .sps file runs on the "Commands" page as far as PSPP knows the commands; Python programs and SPSS extensions do not run. When importing a questionnaire with a codebook (dialog "Questionnaire recognised", "Codebook as well"), Statable takes only labels, missing values and data from an .sps and skips all other commands. PSPP cannot do GLM with WITH (analysis of covariance) or NONPAR CORR (Spearman);'],
  ['daten-oeffnen', 'Daten aus Access oder einer SQL-Datenbank zuerst dort als CSV oder Excel speichern, dann in Statable öffnen. Eine direkte Verbindung zur Datenbank gibt es im Browser nicht.', 'Save data from Access or an SQL database as CSV or Excel there first, then open it in Statable. A direct connection to the database is not possible in the browser.'],
  ['spalten-seite', 'Leere Textzellen zählt Statable als fehlend, wenn die Daten aus CSV, Excel oder Stata kommen oder eingegeben wurden; sie erscheinen dann nicht als eigene Kategorie. In SPSS gilt ein leerer Text als gültiger Wert, solange er nicht als fehlend erklärt ist; eine .sav-Datei öffnet Statable so, wie SPSS sie gespeichert hat. Darum können Fallzahlen bei Textspalten aus CSV oder Excel von SPSS abweichen.', 'Statable counts empty text cells as missing when the data comes from CSV, Excel or Stata or was typed in; they then do not appear as a category of their own. In SPSS an empty text is a valid value unless it is declared missing; Statable opens an .sav file as SPSS saved it. So the number of cases for text columns from CSV or Excel can differ from SPSS.'],
  ['fallgewichte', 'Umfragegewicht: Statable fragt, ob die Personen einzeln gezogen wurden (nicht ganze Klassen, Schulen oder Haushalte, und ohne Schichten). Bei „Ja“ rechnet Statable designbasiert mit dem R-Paket survey: Mittelwerte und Anteile mit Intervall, Kreuztabelle mit Rao-Scott-Test, Gruppenvergleich, lineare und logistische Regression. Bei „Nein oder weiß nicht“ wird nur beschreibend gewichtet', 'Survey weight: Statable asks whether the people were drawn individually (not whole classes, schools or households, and without strata). If "Yes", Statable computes design-based with the R package survey: means and proportions with an interval, cross table with the Rao-Scott test, group comparison, linear and logistic regression. If "No or I do not know", the weighting is descriptive only'],
  ['fallgewichte', 'Darum fragt Statable immer nach der Art und rechnet Tests mit Umfragegewicht nur designbasiert.', 'That is why Statable always asks for the kind and computes tests with a survey weight only design-based.'],
  ['diagramm-anpassen', 'Ein Kreisdiagramm bietet Statable nicht: Balken lassen sich genauer vergleichen, weil das Auge Längen besser schätzt als Winkel und Flächen.', 'Statable offers no pie chart: bars can be compared more precisely, because the eye judges lengths better than angles and areas.'],
];

describe('Fachsätze aus dem SPSS-Vergleich (Paket B und E)', () => {
  for (const [id, d, e] of SAETZE) {
    it(`${id}: „${d.slice(0, 50)}…“ in Deutsch und Englisch`, () => {
      expect(text(de, id)).toContain(d);
      expect(text(en, id)).toContain(e);
    });
  }
  it('Kreisdiagramm ist über die Suche zu finden (de und en)', () => {
    expect(ids('Kreisdiagramm')).toContain('diagramm-anpassen'); expect(ids('Tortendiagramm')).toContain('diagramm-anpassen'); expect(ids('pie chart', en)).toContain('diagramm-anpassen');
  });
  it('fallgewichte: die Antwortwörter stimmen mit den Knöpfen der Pflichtfrage überein, der alte Absatz ist weg', () => {
    expect(klumpenFrage().ja).toBe('Ja'); expect(klumpenFrage().nein).toBe('Nein oder weiß nicht');
    expect(text(de, 'fallgewichte')).not.toContain('Gesperrt sind jeder p-Wert'); expect(text(de, 'fallgewichte')).not.toContain('lässt Umfragegewichte nicht in Tests');
  });
  it('der alte Satz zu Quick Cluster (keine Zufallsstarts) ist ersetzt', () => {
    expect(text(de, 'frage-cluster')).not.toContain('SPSS Quick Cluster hat keine Zufallsstarts');
    expect(text(en, 'frage-cluster')).not.toContain('SPSS Quick Cluster has no random starts');
  });
});

describe('Seite „SPSS-Menü → Statable“ (Paket E)', () => {
  it('es gibt sie in beiden Sprachen mit Titel und Listen', () => {
    for (const l of [de, en]) { const a = l.find(x => x.id === 'spss-menue')!; expect(a).toBeDefined(); expect(a.inhalt.filter(b => typeof b === 'object' && 'ul' in b).length).toBeGreaterThanOrEqual(3); }
    expect(de.find(x => x.id === 'spss-menue')!.titel).toMatch(/^SPSS-Menü/);
  });
  it('Suche nach SPSS-Menüwörtern trifft sie (de)', () => {
    for (const q of ['Variable berechnen', 'Analysieren Häufigkeiten', 'Häufigkeiten', 'Umkodieren', 'Fälle auswählen', 'Analysieren', 'Variablenansicht', 'Dateneditor', 'Schicht', 'Transformieren']) expect(ids(q), q).toContain('spss-menue');
  });
  it('Suche nach SPSS-Menüwörtern trifft sie (en)', () => {
    for (const q of ['Compute Variable', 'Analyze Frequencies', 'Select Cases', 'Recode', 'Variable View', 'Data Editor', 'Layer']) expect(ids(q, en), q).toContain('spss-menue');
  });
  it('„Variable berechnen“ und „Analysieren Häufigkeiten“ führen die Seite unter den ersten Treffern', () => {
    expect(ids('Variable berechnen').indexOf('spss-menue')).toBeLessThan(3);
    expect(ids('Analysieren Häufigkeiten').indexOf('spss-menue')).toBeLessThan(3);
    expect(ids('Compute Variable', en).indexOf('spss-menue')).toBeLessThan(3);
    expect(ids('Analyze Frequencies', en).indexOf('spss-menue')).toBeLessThan(3);
  });
  it('Wortverzeichnis: Variablenansicht → Spalten, Dateneditor → Daten, Schicht → Kontrollvariable/aufteilen', () => {
    expect(ids('Variablenansicht')).toEqual(expect.arrayContaining(['spalten-seite', 'spss-menue']));
    expect(ids('Dateneditor')).toEqual(expect.arrayContaining(['daten-seite', 'spss-menue']));
    expect(ids('Schicht')).toEqual(expect.arrayContaining(['mantel-haenszel', 'spss-menue']));
    expect(ids('Variable View', en)).toEqual(expect.arrayContaining(['spalten-seite']));
    expect(ids('Data Editor', en)).toEqual(expect.arrayContaining(['daten-seite']));
    expect(ids('Layer', en)).toEqual(expect.arrayContaining(['mantel-haenszel']));
    const t = text(de, 'spss-menue');
    expect(t).toContain('„Variablenansicht“ heißt in Statable Seite „Spalten“'); expect(t).toContain('„Dateneditor“ heißt in Statable Seite „Daten“'); expect(t).toContain('Nach dritter Spalte aufteilen (Schicht)');
  });
  it('jede Karte, auf die verwiesen wird, gibt es mit genau diesem Titel (de und en)', () => {
    const FRAGEN: [string, string][] = [['Wie verteilt sich etwas?', 'How is something distributed?'], ['Kommt etwas in Gruppen unterschiedlich oft vor?', 'Does something occur at different rates in different groups?'], ['Stimmen Beurteilungen überein?', 'Do ratings agree?'], ['Unterscheiden sich Gruppen?', 'Do groups differ?'], ['Hat sich etwas verändert?', 'Has something changed?'], ['Verändert sich etwas über mehrere Zeitpunkte?', 'Does something change over several time points?'], ['Lässt sich etwas vorhersagen?', 'Can something be predicted?'], ['Hängen zwei Dinge zusammen?', 'Are two things related?'], ['Wie hängen mehrere Zahlen zusammen?', 'How are several numbers related?'], ['Messen meine Fragen dasselbe?', 'Do my questions measure the same thing?'], ['Wie zuverlässig misst meine Skala?', 'How reliably does my scale measure?'], ['Welche Gruppen stecken in den Daten?', 'Which groups are in the data?'], ['Wie lange dauert es bis zu einem Ereignis?', 'How long does it take until an event?'], ['Wie entwickelt sich ein Wert über die Zeit?', 'How does a value develop over time?'], ['Läuft ein Einfluss über einen Zwischenschritt?', 'Does an influence run through an intermediate step?'], ['Sind meine Daten in Gruppen verschachtelt?', 'Are my data nested in groups?']];
    const td = text(de, 'spss-menue'), te = text(en, 'spss-menue');
    for (const [d, e] of FRAGEN) { expect(td, d).toContain(`„${d}“`); expect(te, e).toContain(`"${e}"`); }
    // ... und es sind die echten Titel der Karten im Code
    const vorher = sitzung.einst.sprache;
    try {
      sitzung.einst.sprache = 'de'; const tde = VERFAHREN.map(v => v.titel);
      sitzung.einst.sprache = 'en'; const ten = VERFAHREN.map(v => v.titel);
      for (const [d, e] of FRAGEN) { expect(tde, d).toContain(d); expect(ten, e).toContain(e); }
    } finally { sitzung.einst.sprache = vorher; }
  });
  it('jeder genannte Daten-Assistent heißt im Code genau so (de und en)', () => {
    const td = text(de, 'spss-menue'), te = text(en, 'spss-menue');
    const vorher = sitzung.einst.sprache;
    try {
      for (const [sp, t] of [['de', td], ['en', te]] as const) {
        sitzung.einst.sprache = sp;
        const namen = ASSISTENTEN.map(a => a.name());
        const q = sp === 'de' ? ['Berechnen', 'Umkodieren', 'Zählen', 'Ränge bilden', 'Datum und Zeit', 'Fehlendcodes setzen', 'Sortieren', 'Fälle auswählen', 'Zusammenführen', 'Aggregieren', 'Doppelte Fälle', 'Auffällige Fälle'] : ['Calculate', 'Recode', 'Count', 'Compute ranks', 'Date and time', 'Set missing codes', 'Sort', 'Select cases', 'Merge', 'Aggregate', 'Duplicate cases', 'Conspicuous cases'];
        for (const n of q) { expect(namen, n).toContain(n); expect(t, n).toContain(sp === 'de' ? `„${n}“` : `"${n}"`); }
      }
    } finally { sitzung.einst.sprache = vorher; }
  });
});
