/**
 * Sätze des Protokolls und der Vorlage (Abschnitt 6, Teil B). Jeder Satz ist ein ganzer fester Text in `L(de, en)`; Namen und Zahlen kommen nur als Platzhalter hinein,
 * nie ein fertiger Sprachtext aus einem anderen `L` (Leitfaden Falle 12): Wo zwei Teile zusammengehören, setzt die Oberfläche sie als getrennte Texte nebeneinander.
 */
import { L } from './sitzung.svelte';
import { csvZelle, type Art, type DatenDatei, type NichtGrund, type ProtokollEintrag } from './protokoll';
import { eurostatQuelleZeilen, eurostatNachtragSatz } from './eurostat';

/** Die Art einer Datenänderung in Klartext. */
export function artText(a: Art): string {
  switch (a) {
    case 'umkodieren': return L('Umkodieren', 'Recode');
    case 'berechnen': return L('Berechnen', 'Calculate');
    case 'auswahl': return L('Fälle auswählen', 'Select cases');
    case 'fehlend': return L('Fehlende Werte festlegen', 'Define missing values');
    case 'beschriften': return L('Beschriftungen oder Messniveau ändern', 'Change labels or measurement level');
    case 'sortieren': return L('Sortieren', 'Sort');
    case 'spalteWeg': return L('Spalte entfernen', 'Remove column');
    case 'umbenennen': return L('Spalte umbenennen', 'Rename column');
    case 'zaehlen': return L('Zählen', 'Count');
    case 'rang': return L('Ränge bilden', 'Rank');
    case 'aggregieren': return L('Kennwerte je Gruppe', 'Statistics per group');
    case 'gewicht': return L('Fallgewicht', 'Case weight');
    case 'befehl': return L('Befehle ausgeführt', 'Commands run');
    case 'zusammen': return L('Dateien zusammenführen', 'Merge files');
    case 'zelle': return L('Wert geändert', 'Value changed');
    case 'zeilePlus': return L('Zeile angefügt', 'Row added');
    case 'zeileWeg': return L('Zeile gelöscht', 'Row deleted');
    case 'einfuegen': return L('Werte eingefügt', 'Values pasted');
    case 'spaltePlus': return L('Spalte angefügt', 'Column added');
    case 'neuaufbau': return L('Daten neu aufgebaut', 'Data rebuilt');
    case 'umformen': return L('Daten umstrukturiert', 'Data reshaped');
    case 'index': return L('Indexzahlen berechnet', 'Index numbers calculated');
    case 'zeitreihe': return L('Zeitreihe berechnet', 'Time series calculated');
    case 'auffaellig': return L('Auffällige Fälle gekennzeichnet', 'Unusual cases flagged');
    case 'reihenfolge': return L('Reihenfolge der Gruppen festgelegt', 'Order of groups set');
    case 'raking': return L('Gewichte berechnet', 'Weights calculated');
    case 'mikro': return L('Mikrodaten geschützt', 'Microdata protected');
    case 'kategorien': return L('Offene Antworten übernommen', 'Open answers written to the data');
    case 'datencheck': return L('Daten-Check angewendet', 'Data check applied');
    case 'lesart': return L('Lesart der Datei geändert', 'Reading of the file changed');
    case 'abgleich': return L('Fälle und Kontrollen abgeglichen', 'Cases and controls matched');
    case 'klassifikation': return L('Klassifikation zugeordnet', 'Classification assigned');
    case 'plausibel': return L('Spalte mit verletzten Regeln angelegt', 'Column with violated rules created');
    case 'vorlage': return L('Vorlage angewendet', 'Template applied');
  }
}

/** Warum ein Schritt nicht wiederholt werden kann (ein ganzer Satz). */
export function nichtGrundText(g: NichtGrund): string {
  switch (g) {
    case 'zeilen': return L('Er bezieht sich auf einzelne Zeilen.', 'It refers to individual rows.');
    case 'aus-daten': return L('Er beruht auf Werten aus den damaligen Daten.', 'It relies on values from the original data.');
    case 'zweite-datei': return L('Er braucht eine zweite Datei.', 'It needs a second file.');
    case 'befehl': return L('Er enthält einen Befehl, der in Vorlagen nicht erlaubt ist.', 'It contains a command that is not allowed in templates.');
    case 'fehler': return L('Er ist mit einer Fehlermeldung zu Ende gegangen.', 'It ended with an error message.');
    case 'neu': return L('Er hat die Daten als neues Projekt aufgebaut.', 'It built the data as a new project.');
    case 'art': return L('Diese Art von Schritt ist in Vorlagen noch nicht möglich.', 'This kind of step is not yet possible in templates.');
    case 'zu-lang': return L('Er ist zu lang für eine Vorlage.', 'It is too long for a template.');
  }
}

/** Fehler beim Lesen einer Vorlagendatei (ein ganzer Satz). */
export function vorlageFehlerText(g: 'unlesbar' | 'neuer' | 'zu-gross'): string {
  if (g === 'neuer') return L('Diese Vorlage stammt aus einer neueren Fassung von Statable und lässt sich hier nicht lesen.', 'This template comes from a newer version of Statable and cannot be read here.');
  if (g === 'zu-gross') return L('Diese Datei ist zu groß für eine Vorlage.', 'This file is too large for a template.');
  return L('Diese Datei lässt sich nicht als Vorlage lesen. Sie ist beschädigt oder keine Vorlage von Statable.', 'This file cannot be read as a template. It is damaged or not a Statable template.');
}

/** Zwei Spalten haben nicht dieselbe Art: ein ganzer Satz je Fall (kein fertiger Text im anderen Text). */
export function andereArtText(name: string, erwartet: 'zahl' | 'text' | 'datum', ist: 'zahl' | 'text' | 'datum'): string {
  const k = erwartet + '>' + ist;
  switch (k) {
    case 'text>zahl': return L(`Die Spalte „${name}“ enthält in den neuen Daten Zahlen, die Vorlage erwartet Text.`, `The column "${name}" holds numbers in the new data, the template expects text.`);
    case 'text>datum': return L(`Die Spalte „${name}“ enthält in den neuen Daten Datumswerte, die Vorlage erwartet Text.`, `The column "${name}" holds dates in the new data, the template expects text.`);
    case 'zahl>text': return L(`Die Spalte „${name}“ enthält in den neuen Daten Text, die Vorlage erwartet Zahlen.`, `The column "${name}" holds text in the new data, the template expects numbers.`);
    case 'zahl>datum': return L(`Die Spalte „${name}“ enthält in den neuen Daten Datumswerte, die Vorlage erwartet Zahlen.`, `The column "${name}" holds dates in the new data, the template expects numbers.`);
    case 'datum>text': return L(`Die Spalte „${name}“ enthält in den neuen Daten Text, die Vorlage erwartet Datumswerte.`, `The column "${name}" holds text in the new data, the template expects dates.`);
    default: return L(`Die Spalte „${name}“ enthält in den neuen Daten Zahlen, die Vorlage erwartet Datumswerte.`, `The column "${name}" holds numbers in the new data, the template expects dates.`);
  }
}

/** Zeitpunkt im Protokoll: Datum und Uhrzeit des Geräts, immer gleich aufgebaut (JJJJ-MM-TT hh:mm:ss). */
export function zeitText(ms: number): string {
  const d = new Date(ms), p = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
export const quelleText = (q: ProtokollEintrag['quelle']) => (q === 'vorlage' ? L('aus Vorlage', 'from template') : L('von Hand', 'by hand'));

/** Der Vermerk zu einem Eintrag (leer, wenn es nichts zu vermerken gibt): zurückgenommen, wiederholt, abgebrochen, Fehler, Angaben zur Vorlage. Ganze Sätze mit Zahlen, nie Werte aus den Daten. */
export function vermerkText(e: ProtokollEintrag): string {
  const t: string[] = [];
  if (e.art === 'vorlage' && e.pruefung) {
    const p = e.pruefung;
    t.push(L(`Prüfung vor dem Lauf: ${p.sperren} Sperren, ${p.warnungen} Warnungen, ${p.hinweise} Hinweise.`, `Check before the run: ${p.sperren} blocks, ${p.warnungen} warnings, ${p.hinweise} notes.`));
    if (p.warnungen) t.push(p.bestaetigt
      ? L(`Die Warnungen wurden bestätigt. In ${p.zeilenNeueKategorien} Zeilen blieben Werte, die ein Umkodieren nicht kannte, wie es der Schritt vorsieht.`, `The warnings were confirmed. In ${p.zeilenNeueKategorien} rows, values that a recode did not know were left as the step provides.`)
      : L('Die Warnungen wurden nicht bestätigt.', 'The warnings were not confirmed.'));
  }
  if (e.art === 'abgleich' && e.abgleich) {
    const a = e.abgleich;
    t.push(L(`Abgleich nach der Spalte ${a.fall}, bis zu ${a.k} Kontrollen je Fall.`, `Matching on the column ${a.fall}, up to ${a.k} controls per case.`));
    t.push(a.anker.length ? L(`Genau gleich sein müssen: ${a.anker.join(', ')}.`, `Must be exactly equal: ${a.anker.join(', ')}.`) : L('Keine Spalte muss genau gleich sein.', 'No column has to be exactly equal.'));
    t.push(L(`Zahlen mit Toleranz: ${a.zahlen.map(z => `${z.spalte} (${z.toleranz})`).join(', ')}.`, `Numbers with tolerance: ${a.zahlen.map(z => `${z.spalte} (${z.toleranz})`).join(', ')}.`));
    t.push(L(`${a.faelle} Fälle, davon ${a.voll} voll abgeglichen, ${a.teilweise} teilweise und ${a.ohne} ohne Kontrolle; ${a.ausgeschlossen} Zeilen nahmen nicht teil. Das Verfahren ist gierig und hängt von der Reihenfolge der Zeilen ab.`, `${a.faelle} cases, of which ${a.voll} fully matched, ${a.teilweise} partly and ${a.ohne} without a control; ${a.ausgeschlossen} rows did not take part. The method is greedy and depends on the order of the rows.`));
  }
  if (e.zuordnung) t.push(L(`Die Spalte ${e.zuordnung.von} wurde der Spalte ${e.zuordnung.nach} der Vorlage zugeordnet.`, `The column ${e.zuordnung.von} was matched to the template column ${e.zuordnung.nach}.`));
  if (e.wiederholtVon) t.push(L(`Wiederholt nach Rückgängig (Eintrag ${e.wiederholtVon}).`, `Redone after undo (entry ${e.wiederholtVon}).`));
  if (e.zurueck) t.push(e.zurueck.grund === 'abbruch'
    ? L(`Zurückgenommen, weil der Lauf abgebrochen wurde (${zeitText(e.zurueck.zeit)}).`, `Taken back because the run was stopped (${zeitText(e.zurueck.zeit)}).`)
    : L(`Zurückgenommen (${zeitText(e.zurueck.zeit)}).`, `Undone (${zeitText(e.zurueck.zeit)}).`));
  if (e.ergebnis === 'fehler') t.push(L('PSPP hat den Befehl mit einer Fehlermeldung beendet.', 'PSPP ended the command with an error message.'));
  if (e.ergebnis === 'abgebrochen') t.push(e.grund === 'person' ? L('Der Schritt wurde abgebrochen.', 'The step was stopped.') : e.grund === 'pspp' ? L('PSPP hat den Schritt abgelehnt.', 'PSPP rejected the step.') : L('Der Schritt ließ sich nicht ausführen.', 'The step could not be run.'));
  if (e.nicht && e.art !== 'vorlage' && e.ergebnis === 'ok' && !e.zurueck) t.push(L('Nicht wiederholbar.', 'Not repeatable.'), nichtGrundText(e.nicht));
  return t.join(' ');
}

/** Das Protokoll als CSV (Semikolon, mit Kopfzeile, UTF-8 mit Markierung für Excel). Der Befehl steht nur dort, wo der Schritt wiederholbar ist; er enthält höchstens Regeln der Person. */
export function protokollCsv(eintraege: readonly ProtokollEintrag[], datei?: DatenDatei): string {
  const kopf = [L('Nr.', 'No.'), L('Art', 'Type'), L('Spalten', 'Columns'), L('Betroffene Zeilen', 'Rows affected'), L('Zeilen vorher', 'Rows before'), L('Zeilen nachher', 'Rows after'), L('Zeitpunkt', 'Time'), L('Quelle', 'Source'),
    L('Vorlagendatei', 'Template file'), L('Schritt in der Vorlage', 'Step in the template'), L('Prüfsumme der Vorlage (SHA-256)', 'Template checksum (SHA-256)'), L('Datei der Daten', 'Data file'), L('Prüfsumme der Datei (SHA-256)', 'File checksum (SHA-256)'), L('Vermerk', 'Note'), L('Befehl', 'Command')];
  const zeilen = eintraege.map(e => [e.nr, artText(e.art), e.spalten.join(', '), e.betroffen ?? '', e.vorher, e.nachher, zeitText(e.zeit), quelleText(e.quelle),
    e.vorlage?.datei ?? '', e.vorlage?.schritt ?? '', e.vorlage?.pruefsummeVorlage ?? '', e.vorlage?.datenName ?? '', e.vorlage?.pruefsummeDaten ?? '', vermerkText(e), e.wiederhol?.typ === 'syntax' ? e.wiederhol.befehle.join(' ') : '']);
  // Daten von Eurostat: die Quelle und die genaue Abfrage stehen unter dem Protokoll (Fachblatt SAISON-EUROSTAT, Abschnitt 2).
  const quelle: string[][] = datei?.eurostat ? [[''], ...quellenZeilen(datei).map(z => [z])] : [];
  return '\uFEFF' + [kopf, ...zeilen, ...quelle].map(z => z.map(csvZelle).join(';')).join('\r\n') + '\r\n';
}

/** Die Zeilen zur Herkunft der Daten, wenn sie von Eurostat kommen (sonst keine): Quelle, Datensatz, Abrufdatum, Stand laut Eurostat, genaue Abfrage, dazu die Warnung, dass Eurostat Daten ändern kann. */
export const quellenZeilen = (datei?: DatenDatei): string[] => (datei?.eurostat ? [...eurostatQuelleZeilen(datei.eurostat), eurostatNachtragSatz()] : []);

/** Der Anhang „Protokoll der Datenänderungen“ für Word und PDF (und die Vorschau): Kopf und Zeilen als Text. Keine Werte aus den Daten; zurückgenommene Schritte stehen mit Vermerk darin. */
export interface BerichtAnhang { titel: string; kopf: string[]; zeilen: string[][] }
export function protokollAnhang(eintraege: readonly ProtokollEintrag[], datei?: DatenDatei): BerichtAnhang {
  return {
    titel: L('Anhang: Protokoll der Datenänderungen', 'Appendix: log of data changes'),
    kopf: [L('Nr.', 'No.'), L('Art', 'Type'), L('Spalten', 'Columns'), L('Zeilen betroffen', 'Rows affected'), L('Zeitpunkt', 'Time'), L('Quelle', 'Source'), L('Vermerk', 'Note')],
    zeilen: [
      ...(datei ? [['', L('Datei der Daten', 'Data file'), datei.name, '', '', '', datei.sha256 ? L(`Prüfsumme (SHA-256): ${datei.sha256}`, `Checksum (SHA-256): ${datei.sha256}`) : '']] : []),
      ...quellenZeilen(datei).map(t => ['', L('Quelle der Daten', 'Source of the data'), t, '', '', '', '']),
      ...eintraege.map(e => [String(e.nr), artText(e.art), e.spalten.join(', '), e.betroffen === null ? '' : String(e.betroffen), zeitText(e.zeit), quelleText(e.quelle) + (e.vorlage ? `: ${e.vorlage.datei}, ${L('Schritt', 'step')} ${e.vorlage.schritt}` : ''), vermerkText(e)])
    ]
  };
}
