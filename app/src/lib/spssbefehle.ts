/**
 * SPSS-Befehle, die in Statable anders laufen als in SPSS (Prüfbericht B, 07.11.2026).
 *
 * 1. `vorlauf` bereitet eine Syntax vor, BEVOR sie an PSPP geht (Zeilen bleiben Zeilen, damit Fehlerstellen stimmen):
 *    - mehrzeilige Kommentare (Schrägstrich-Stern bis Stern-Schrägstrich) werden zeilenweise zu einzeiligen (PSPP kennt nur diese),
 *    - `GET FILE`, `GET DATA`, `GET SAS|STATA|TRANSLATE`, `IMPORT` mit Dateipfad werden übersprungen (Statable liest keine Dateien von der Festplatte;
 *      PSPP bräche sonst die ganze Datei ab: „Stopping syntax processing here …“),
 *    - Python- und GPL-Blöcke (BEGIN PROGRAM … END PROGRAM) werden übersprungen (sonst läsen PSPP die Zeilen als Befehle),
 *    - GLM … /WSFACTOR (Messwiederholung) geht nicht an PSPP,
 *    - SAVE OUTFILE, SAVE TRANSLATE, EXPORT bekommen danach einen Hinweis: es entsteht keine Datei.
 *    Übersprungenes wird durch Kommentarzeilen mit festem Text ersetzt - nie steht Text aus der Datei in einem Befehl (Regeln in befehlstext.ts).
 *    Für jedes Übersprungene entsteht eine Meldung „Statable: …“, die `spssMeldung` für die Seite übersetzt.
 * 2. `spssMeldung` übersetzt Meldungen: SPSS-Befehle, die PSPP nicht kennt, mit dem Weg in Statable; und die „Statable: …“-Meldungen aus 1.
 * REIN: kein Zugriff auf Engine, Daten oder Netz.
 */
import { L, d } from './sitzung.svelte';
import { teileBefehle } from './befehlsteile';
import { pk } from './befehlstext';

/** Meldungen eines Vorlaufs: `vorher` steht über der Ausgabe, `nachher` darunter. */
export interface Vorlauf { text: string; vorher: string[]; nachher: string[] }

/** Ein Kommentar mit Schrägstrich-Stern über mehrere Zeilen wird je Zeile zu einem einzeiligen (Zeilenzahl bleibt). */
export function kommentareEinzeilig(text: string): string {
  if (!text.includes('/*')) return text;
  let offen = false;
  return text.split('\n').map(z => {
    let rest = z, neu = '';
    while (rest.length || (offen && !neu)) {
      if (offen) {
        const e = rest.indexOf('*/');
        if (e < 0) { neu += `/* ${rest.trim()} */`; rest = ''; break; }
        neu += `/* ${rest.slice(0, e).trim()} */`; rest = rest.slice(e + 2); offen = false;
      } else {
        // nächstes „/*“ außerhalb von Anführungszeichen
        let anf = '', i = -1;
        for (let k = 0; k < rest.length; k++) {
          const c = rest[k]!;
          if (anf) { if (c === anf) anf = ''; continue; }
          if (c === "'" || c === '"') { anf = c; continue; }
          if (c === '/' && rest[k + 1] === '*') { i = k; break; }
        }
        if (i < 0) { neu += rest; rest = ''; break; }
        neu += rest.slice(0, i);
        const e = rest.indexOf('*/', i + 2);
        if (e >= 0) { neu += rest.slice(i, e + 2); rest = rest.slice(e + 2); }
        else { neu += `/* ${rest.slice(i + 2).trim()} */`; rest = ''; offen = true; break; }
      }
    }
    return neu;
  }).join('\n');
}

const GET = /^(GET(?:\s+(?:FILE|DATA|SAS|STATA|TRANSLATE|CAPTURE))?|IMPORT)\b/i;
const SPEICHERN = /^(SAVE(?:\s+(?:TRANSLATE|DATA\s+COLLECTION|OUTFILE))?|XSAVE|EXPORT)\b/i;
const PROGRAMM = /^BEGIN\s+(PROGRAM|GPL)\b/i;
const PROGRAMM_ENDE = /^END\s+(PROGRAM|GPL)\b/i;
const norm = (x: string) => x.replace(/\s+/g, ' ').toUpperCase();
/** Die erste Zeichenkette in Anführungszeichen (der Dateiname), gekürzt und einzeilig; sonst leer. */
const dateiAus = (t: string) => { const m = /(['"])([^'"\n]*)\1/.exec(t); return m ? ` '${pk(m[2], 100).replace(/'/g, '')}'` : ''; };
/** Kommentarzeilen mit festem Text statt der Zeilen von `von` bis `bis` (alles in `zeilen`, 0-basiert). */
function ersetze(zeilen: string[], von: number, bis: number) {
  for (let i = von; i <= bis; i++) zeilen[i] = i === von ? '* Statable: uebersprungen.' : '* .';
}

/** Syntax vorbereiten (siehe Kopf der Datei). `datenOffen`: Sind Daten geöffnet? Bestimmt nur den Wortlaut der Meldung. */
export function vorlauf(roh: string, datenOffen: boolean): Vorlauf {
  const vorher: string[] = [], nachher: string[] = [];
  const zeilen = kommentareEinzeilig(roh.replace(/\r/g, '')).split('\n');
  // Programmblöcke zuerst: Ihre Zeilen sind keine Befehle
  for (let i = 0; i < zeilen.length; i++) {
    const m = PROGRAMM.exec(zeilen[i]!.trim());
    if (!m) continue;
    let ende = zeilen.length - 1;
    for (let k = i + 1; k < zeilen.length; k++) if (PROGRAMM_ENDE.test(zeilen[k]!.trim())) { ende = k; break; }
    ersetze(zeilen, i, ende);
    vorher.push(`Statable: unsupported BEGIN ${m[1]!.toUpperCase()}`);
    i = ende;
  }
  let offen = datenOffen, geschrieben = false;
  for (const p of teileBefehle(zeilen.join('\n'))) {
    // Kommentarzeilen vor dem Befehl bleiben; der Befehl beginnt in der Zeile mit seinem Namen
    const kopfZeile = zeilen.findIndex((l, i) => i >= p.von && i <= p.bis && l.trim() === p.kopf);
    const ab = kopfZeile < 0 ? p.von : kopfZeile;
    const kopf = norm(p.kopf);
    const text = zeilen.slice(ab, p.bis + 1).join('\n');
    if (/^DATA\s+LIST\b/.test(kopf)) offen = true;
    const g = GET.exec(p.kopf.trim());
    if (g && !geschrieben && !/\bINLINE\b/i.test(text)) {
      vorher.push(`Statable: skipped ${norm(g[1]!)}${dateiAus(text)} (${offen ? 'open' : 'closed'})`);
      ersetze(zeilen, ab, p.bis);
    } else if (/^(GLM|UNIANOVA)\b/.test(kopf) && /\/\s*WSFACTOR\b/i.test(text)) {
      vorher.push('Statable: unsupported GLM /WSFACTOR');
      ersetze(zeilen, ab, p.bis);
    } else if (SPEICHERN.test(p.kopf.trim())) {
      geschrieben = true;
      nachher.push(`Statable: not saved ${norm(SPEICHERN.exec(p.kopf.trim())![1]!)}${dateiAus(text)}`);
    }
  }
  return { text: zeilen.join('\n'), vorher, nachher };
}

// ---------------------------------------------------------------------------------------------------------------------------------------
// Meldungen

export interface SpssMeldung { titel: string; text: string; tun: string; art: string }

const MELDEN = () => d('Fehlt es dir? „Melden“ oben rechts.', 'Fehlt es Ihnen? „Melden“ oben rechts.', 'Do you miss it? "Report" at the top right.');
const NEIN = () => L('Statable kann das noch nicht.', 'Statable cannot do this yet.') + ' ' + MELDEN();
const geht = (so: string) => L('In Statable geht es so: ', 'In Statable it works like this: ') + so;

/** Was jeder SPSS-Befehl, den PSPP nicht kennt, in Statable ist. Schlüssel: Befehlsname (Großbuchstaben); für `GRAPH /LINE` gilt der Eintrag `GRAPH`. Die Namen der Fragen stehen in lib/verfahren.ts, die der Blöcke in bausteine/. */
const OHNE_PSPP: Record<string, () => string> = {
  'PARTIAL CORR': () => geht(L('Frage „Hängen zwei Dinge zusammen?“ - dort bei „Soll etwas herausgerechnet werden?“ die Kontrollvariablen wählen (Partialkorrelation).', 'question "Are two things related?" - there choose the control variables under "Should anything be controlled for?" (partial correlation).')),
  'CLUSTER': () => geht(L('Frage „Welche Gruppen stecken in den Daten?“ (Ward-Verfahren, k-Means).', 'question "Which groups are in the data?" (Ward\'s method, k-means).')),
  'TWOSTEP CLUSTER': () => geht(L('Frage „Welche Gruppen stecken in den Daten?“ (Ward-Verfahren, k-Means; ein Two-Step-Verfahren gibt es nicht).', 'question "Which groups are in the data?" (Ward\'s method, k-means; there is no two-step method).')),
  'MIXED': () => geht(L('Frage „Sind meine Daten in Gruppen verschachtelt?“ (Mehrebenenmodell).', 'question "Are my data nested in groups?" (multilevel model).')),
  'GENLINMIXED': () => geht(L('Frage „Sind meine Daten in Gruppen verschachtelt?“ (Mehrebenenmodell, auch für Ja/Nein).', 'question "Are my data nested in groups?" (multilevel model, also for yes/no).')),
  'NOMREG': () => geht(L('Frage „Lässt sich etwas vorhersagen?“ - ist das Ziel Text mit 3 bis 12 Stufen, rechnet Statable eine multinomiale Regression.', 'question "Can something be predicted?" - if the target is text with 3 to 12 levels, Statable calculates a multinomial regression.')),
  'PLUM': () => geht(L('Frage „Lässt sich etwas vorhersagen?“ - ist das Ziel geordneter Text mit 3 bis 12 Stufen, rechnet Statable eine ordinale Regression.', 'question "Can something be predicted?" - if the target is ordered text with 3 to 12 levels, Statable calculates an ordinal regression.')),
  'GENLIN': () => geht(L('Frage „Lässt sich etwas vorhersagen?“ - für Ja/Nein logistisch, für Zähldaten unter „Weitere Wege“ Poisson oder negativ-binomial.', 'question "Can something be predicted?" - logistic for yes/no, for count data under "More ways" Poisson or negative binomial.')),
  'NLR': () => geht(L('Frage „Lässt sich etwas vorhersagen?“ - unter „Weitere Wege“ die Kurvenanpassung und die nichtlineare Regression.', 'question "Can something be predicted?" - under "More ways" the curve fitting and the nonlinear regression.')),
  'CURVEFIT': () => geht(L('Frage „Lässt sich etwas vorhersagen?“ - unter „Weitere Wege“ die Kurvenanpassung.', 'question "Can something be predicted?" - under "More ways" the curve fitting.')),
  'WLS': () => geht(L('Frage „Lässt sich etwas vorhersagen?“ - unter „Weitere Wege“ die gewichtete Regression.', 'question "Can something be predicted?" - under "More ways" the weighted regression.')),
  'TREE': () => geht(L('Frage „Lässt sich etwas vorhersagen?“ - darunter „Entscheidungsbaum: Wer gehört zu welcher Gruppe?“.', 'question "Can something be predicted?" - below it "Decision tree: who belongs to which group?".')),
  'MVA': () => geht(L('Frage „Wie verteilt sich etwas?“ - darunter „Fehlen Werte zufällig? (Little-Test)“.', 'question "How is something distributed?" - below it "Are values missing at random? (Little test)".')),
  'MULTIPLE IMPUTATION': () => geht(L('Frage „Wie verteilt sich etwas?“ - darunter „Lücken füllen und trotzdem rechnen (Mehrfachimputation)“.', 'question "How is something distributed?" - below it "Fill the gaps and still calculate (multiple imputation)".')),
  'COXREG': () => geht(L('Frage „Wie lange dauert es bis zu einem Ereignis?“ - die Spalten bei „Welche Angaben sollen das Risiko erklären?“ ergeben die Cox-Regression.', 'question "How long does it take until an event?" - the columns under "Which characteristics should explain the risk?" give the Cox regression.')),
  'KM': () => geht(L('Frage „Wie lange dauert es bis zu einem Ereignis?“ (Kaplan-Meier, Log-Rank-Test).', 'question "How long does it take until an event?" (Kaplan-Meier, log-rank test).')),
  'SURVIVAL': () => geht(L('Frage „Wie lange dauert es bis zu einem Ereignis?“ (Kaplan-Meier statt Sterbetafel).', 'question "How long does it take until an event?" (Kaplan-Meier instead of a life table).')),
  'ARIMA': () => geht(L('Frage „Wie entwickelt sich ein Wert über die Zeit?“ - die Prognose mit ARIMA rechnet Statable dort auf Klick.', 'question "How does a value develop over time?" - Statable calculates the ARIMA forecast there on a click.')),
  'TSMODEL': () => geht(L('Frage „Wie entwickelt sich ein Wert über die Zeit?“ (Verlauf, Trend, Autokorrelation, Prognose).', 'question "How does a value develop over time?" (course, trend, autocorrelation, forecast).')),
  'EXSMOOTH': () => geht(L('Frage „Wie entwickelt sich ein Wert über die Zeit?“ (Verlauf, Trend, gleitender Mittelwert, Prognose).', 'question "How does a value develop over time?" (course, trend, moving average, forecast).')),
  'CORRESPONDENCE': () => geht(L('Frage „Kommt etwas in Gruppen unterschiedlich oft vor?“ - darunter „Karte der Tabelle (Korrespondenzanalyse)“.', 'question "Does something occur at different rates in different groups?" - below it "Map of the table (correspondence analysis)".')),
  'ALSCAL': () => geht(L('Frage „Wie zuverlässig misst meine Skala?“ - darunter „Karte der Fragen (mehrdimensionale Skalierung)“.', 'question "How reliably does my scale measure?" - below it "Map of the questions (multidimensional scaling)".')),
  'MANOVA': () => geht(L('Frage „Unterscheiden sich Gruppen in mehreren Zahlen zugleich?“.', 'question "Do groups differ on several numbers at once?".')),
  'DISCRIMINANT': () => geht(L('Frage „Lässt sich die Gruppe eines Falls aus Zahlen erkennen?“ (Diskriminanzanalyse).', 'question "Can the group of a case be recognized from numbers?" (discriminant analysis).')),
  'LOGLINEAR': () => geht(L('Frage „Wie hängen mehrere Kategorien zusammen?“ (loglineares Modell).', 'question "How are several categories related?" (log-linear model).')),
  'HILOGLINEAR': () => geht(L('Frage „Wie hängen mehrere Kategorien zusammen?“ (loglineares Modell).', 'question "How are several categories related?" (log-linear model).')),
  'MULT RESPONSE': () => geht(L('Frage „Wie verteilt sich etwas?“ oder „Kommt etwas in Gruppen unterschiedlich oft vor?“ - beide zählen Mehrfachantworten-Sets.', 'question "How is something distributed?" or "Does something occur at different rates in different groups?" - both count multiple-response sets.')),
  'REPORT': () => geht(L('Seite „Bericht“ - sie macht aus den Ergebnissen eine Word-Datei oder ein PDF.', 'page "Report" - it turns the results into a Word file or a PDF.')),
  'SUMMARIZE': () => geht(L('Frage „Unterscheiden sich Gruppen?“ zeigt Anzahl, Mittelwert und Streuung je Gruppe.', 'question "Do groups differ?" shows the number, mean and spread per group.')),
  'GRAPH': () => geht(L('Diagramme gibt es im Blatt zur passenden Frage unter „Diagramme“; dort lässt sich das Diagramm anpassen und exportieren.', 'Charts are on the sheet for the matching question under "Charts"; there the chart can be adjusted and exported.')),
  'GGRAPH': () => geht(L('Diagramme gibt es im Blatt zur passenden Frage unter „Diagramme“; dort lässt sich das Diagramm anpassen und exportieren.', 'Charts are on the sheet for the matching question under "Charts"; there the chart can be adjusted and exported.')),
  'OMS': () => geht(L('Ergebnisse lassen sich an jeder Tabelle über „Export“ als Word oder Excel speichern, oder gesammelt über die Seite „Bericht“.', 'Results can be saved as Word or Excel on every table via "Export", or together via the page "Report".')),
  'OMSEND': () => geht(L('Ergebnisse lassen sich an jeder Tabelle über „Export“ als Word oder Excel speichern, oder gesammelt über die Seite „Bericht“.', 'Results can be saved as Word or Excel on every table via "Export", or together via the page "Report".')),
  'OUTPUT': () => geht(L('Ergebnisse lassen sich an jeder Tabelle über „Export“ als Word oder Excel speichern, oder gesammelt über die Seite „Bericht“.', 'Results can be saved as Word or Excel on every table via "Export", or together via the page "Report".')),
  'BEGIN PROGRAM': () => d('Python-Programme laufen in Statable nicht. Rechne mit den Befehlen und den Fragen unter „Neue Auswertung“.', 'Python-Programme laufen in Statable nicht. Rechnen Sie mit den Befehlen und den Fragen unter „Neue Auswertung“.', 'Python programs do not run in Statable. Calculate with the commands and the questions under "New analysis".'),
  'BEGIN GPL': () => L('GPL-Grafikprogramme laufen in Statable nicht. Diagramme gibt es im Blatt zur passenden Frage unter „Diagramme“.', 'GPL chart programs do not run in Statable. Charts are on the sheet for the matching question under "Charts".'),
  'GLM /WSFACTOR': () => geht(L('Frage „Verändert sich etwas über mehrere Zeitpunkte?“ (Messwiederholung).', 'question "Does something change over several time points?" (repeated measures).')),
  // Wo es in Statable keinen Weg gibt:
  'CATPCA': NEIN, 'PROXIMITIES': NEIN
};

/** Name für die Anzeige: Eintrag in der Tabelle suchen - erst genau, dann das erste Wort (OUTPUT NAME → OUTPUT), dann vor dem „/“ (GRAPH /LINE → GRAPH). */
function suche(name: string): { schluessel: string; weg: () => string } | null {
  const n = norm(name).trim();
  for (const k of [n, n.split(' /')[0]!, n.split(' ')[0]!]) if (OHNE_PSPP[k]) return { schluessel: k, weg: OHNE_PSPP[k]! };
  return null;
}

/** Eine Meldung der Engine oder von Statable (siehe `vorlauf`) in einen freundlichen Text, oder null, wenn dafür keine Regel hier gilt. NONPAR CORR und GLM … WITH haben eigene Regeln in messages.*.json. */
export function spssMeldung(text: string): SpssMeldung | null {
  // von Statable selbst
  const sk = /^Statable: skipped (GET(?: [A-Z]+)?|IMPORT)((?: '.*')?) \((open|closed)\)$/.exec(text);
  if (sk) {
    const was = sk[1]! + sk[2]!;
    return sk[3] === 'open'
      ? { titel: L('Die Daten sind schon offen', 'The data are already open'), art: 'hinweis',
          text: L(`${was} wurde übersprungen; es wird mit den offenen Daten gerechnet.`, `${was} was skipped; the calculation uses the data that are open.`),
          tun: d('Nichts zu tun. Sollen es andere Daten sein, öffne sie zuerst auf der Startseite.', 'Nichts zu tun. Sollen es andere Daten sein, öffnen Sie sie zuerst auf der Startseite.', 'Nothing to do. If you want other data, open them first on the start page.') }
      : { titel: L('Statable liest keine Dateien von der Festplatte', 'Statable cannot read files from the disk'), art: 'datei',
          text: L(`${was} wurde übersprungen: Statable kann keine Dateien von der Festplatte des Rechners lesen, und es sind noch keine Daten geöffnet.`, `${was} was skipped: Statable cannot read files from the computer's disk, and no data are open yet.`),
          tun: d('Öffne die Datei zuerst (auf die Startseite ziehen) und führe dann die Befehle aus.', 'Öffnen Sie die Datei zuerst (auf die Startseite ziehen) und führen Sie dann die Befehle aus.', 'Open the file first (drag it onto the start page), then run the commands.') };
  }
  const ns = /^Statable: not saved (.+?)((?: '.*')?)$/.exec(text);
  if (ns) {
    return { titel: L('Statable speichert keine Dateien über Befehle', 'Statable does not save files through commands'), art: 'datei',
      text: L(`${ns[1]}${ns[2]} hat keine Datei zum Herunterladen erzeugt.`, `${ns[1]}${ns[2]} has not produced a file to download.`),
      tun: L('Zum Speichern: Seite „Daten“ → „Daten exportieren“ (Excel, SPSS .sav oder CSV).', 'To save: page "Data" → "Export data" (Excel, SPSS .sav or CSV).') };
  }
  // Warnungen von PSPP: gerechnet wurde trotzdem
  if (/had a weight value that was user-missing, system-missing, zero, or negative/.test(text)) {
    return { titel: L('Fälle ohne gültiges Gewicht wurden ausgelassen', 'Cases without a valid weight were left out'), art: 'hinweis',
      text: L('Mindestens ein Fall hatte das Gewicht 0, ein negatives oder ein fehlendes Gewicht. Diese Fälle zählen in dieser Rechnung nicht mit.', 'At least one case had a weight of 0, a negative weight or a missing weight. These cases are not counted in this calculation.'),
      tun: d('Das Ergebnis steht in der Tabelle. Prüfe die Gewichtsspalte, wenn es dich überrascht.', 'Das Ergebnis steht in der Tabelle. Prüfen Sie die Gewichtsspalte, wenn es Sie überrascht.', 'The result is in the table. Check the weight column if this surprises you.') };
  }
  const tf = /Partial case discarded\.\s+The first variable missing was (\S+?)\./.exec(text);
  if (tf) {
    return { titel: L('Ein Fall war unvollständig', 'A case was incomplete'), art: 'daten',
      text: L(`Ein Fall wurde verworfen: für „${tf[1]}“ war kein Wert mehr da. Das passiert, wenn sich Werte verschieben - zum Beispiel durch ein Dezimalkomma (70,5) bei DATA LIST FREE; dort trennt das Komma Werte.`, `A case was discarded: there was no value left for "${tf[1]}". This happens when values shift - for example because of a decimal comma (70,5) with DATA LIST FREE, where the comma separates values.`),
      tun: d('Schreibe vor die Daten SET DECIMAL=COMMA. und lies sie mit DATA LIST LIST(\';\'), mit Semikolon zwischen den Werten.', 'Schreiben Sie vor die Daten SET DECIMAL=COMMA. und lesen Sie sie mit DATA LIST LIST(\';\'), mit Semikolon zwischen den Werten.', 'Put SET DECIMAL=COMMA. before the data and read them with DATA LIST LIST(\';\'), with a semicolon between the values.') };
  }
  // Schrittweise Regression: PSPP rechnet in REGRESSION nur ENTER
  if (/REGRESSION: Syntax error expecting ENTER\./.test(text)) {
    return { titel: L('Schrittweise Auswahl gibt es nicht', 'There is no stepwise selection'), art: 'nicht-verstanden',
      text: L('PSPP rechnet in REGRESSION nur /METHOD=ENTER, keine automatische schrittweise Auswahl (STEPWISE, FORWARD, BACKWARD).', 'In REGRESSION, PSPP only runs /METHOD=ENTER, no automatic stepwise selection (STEPWISE, FORWARD, BACKWARD).'),
      tun: d('In Statable legst du die Reihenfolge selbst fest: Frage „Lässt sich etwas vorhersagen?“, mehrere Spalten, „Blöcke bilden“. An den Daten hat sich nichts geändert.', 'In Statable legen Sie die Reihenfolge selbst fest: Frage „Lässt sich etwas vorhersagen?“, mehrere Spalten, „Blöcke bilden“. An den Daten hat sich nichts geändert.', 'In Statable you set the order yourself: question "Can something be predicted?", several columns, "Build blocks". Your data has not changed.') };
  }
  const un = /^Statable: unsupported (.+)$/.exec(text);
  const pf = /error: ([A-Z][A-Z0-9 -]*?): ([A-Z][A-Z0-9 -]*?) is not yet implemented/.exec(text);
  const uk = /Unknown command `([^'\n]+)'/.exec(text);
  const name = un ? un[1]! : pf ? (pf[1] === pf[2] ? pf[1]! : `${pf[1]} /${pf[2]}`) : uk ? uk[1]! : '';
  if (!name || /^NONPAR CORR$/i.test(name)) return null;
  const t = suche(name);
  if (!t) return pf ? { titel: L('Diesen SPSS-Befehl kann PSPP nicht', 'PSPP cannot run this SPSS command'), art: 'nicht-verstanden',
    text: L(`„${name}“ ist ein SPSS-Befehl, den die Rechenmaschine PSPP nicht kann. An den Daten hat sich nichts geändert.`, `"${name}" is an SPSS command that the calculation engine PSPP cannot run. Your data has not changed.`), tun: NEIN() } : null;
  const programm = /^BEGIN (PROGRAM|GPL)$/.test(norm(name));
  return { titel: programm ? L('Dieses Programm läuft in Statable nicht', 'This program does not run in Statable') : L('Diesen SPSS-Befehl kann PSPP nicht', 'PSPP cannot run this SPSS command'), art: 'nicht-verstanden',
    text: programm ? L(`Die Rechenmaschine PSPP kann „${name}“ nicht. Der Block wurde übersprungen; die übrigen Befehle laufen weiter.`, `The calculation engine PSPP cannot run "${name}". The block was skipped; the other commands run on.`)
      : L(`Diesen SPSS-Befehl kann die Rechenmaschine PSPP nicht: „${name}“. An den Daten hat sich nichts geändert.`, `The calculation engine PSPP cannot run this SPSS command: "${name}". Your data has not changed.`),
    tun: t.weg() };
}
