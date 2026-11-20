# QDA-Testdateien (Welle S-C, G13 Stufe 1) - ALLE NACHGEBAUT, KEIN ECHTER EXPORT

Erzeugt von `scripts/spaeter-c-erwartet.R`. Zahlen und erwartete Erkennung: `../spaeter-c-erwartet.json` (Abschnitt `qda`); Test: `qdaimport.test.ts`.

**Mini-Projekt von Hand:** 4 Dokumente (`Interview_Müller`, `Interview_Schmidt`, `Interview_Öztürk`, `Gruppendiskussion_1`), 5 Codes
(`Motivation\Intrinsisch`, `Motivation\Extrinsisch`, `Rückmeldung\Lehrkraft`, `Rückmeldung\Peers`, `Belastung`), 2 Codierende (A, B), 33 codierte Stellen
(darunter genau eine **doppelte** Stelle von A: Müller, Intrinsisch, 10-60). Die Segmente stehen in `segmente.csv`; alle Matrizen sind daraus gezählt.

Es gibt auf diesem Mac **keine echten Exporte** von MAXQDA, ATLAS.ti oder NVivo. Die Layouts sind nach der Herstellerdokumentation nachgebaut; **das genaue Layout
der Excel-Exporte ist bei allen drei Herstellern in der Hilfe nicht beschrieben** (nur Screenshots) und muss an einer echten Datei bestätigt werden.

| Datei | nachgebaut nach | Inhalt |
|---|---|---|
| `maxqda-code-matrix.xlsx` | MAXQDA Hilfe, Code-Matrix-Browser (Visual Tools), Export der Häufigkeitstabelle | nur Codierende A; Codes in Zeilen, Dokumente in Spalten; Nullen als leere Zellen; Zeile und Spalte `SUMME` |
| `maxqda-code-matrix-hierarchie.xlsx` | dasselbe | mit den Elterncodes `Motivation` und `Rückmeldung` (Zeile = Summe der Kinder) |
| `maxqda-code-matrix-summe-falsch.xlsx` | dasselbe | in der Summenzeile ist eine Zahl um 1 falsch: darf nicht still weggelassen werden |
| `maxqda-dokumentvariablen.xlsx`, `.sav` | MAXQDA Hilfe "Variablen exportieren" (Excel, `.sav` nur für Dokumentvariablen) | Dokumentname (abweichend geschrieben: Unicode-NFD, klein, Leerzeichen, Endung `.docx`), Alter, Geschlecht, `Teilnehmer-ID`; `Gruppendiskussion_1` fehlt |
| `atlasti-code-dokument-tabelle.xlsx` | ATLAS.ti "Code-Document Table" (`https://atlasti.com/research-hub/analyzing-code-frequencies-with-atlas-ti-8-windows-mac-the-code-document-table`) | Häufigkeiten, Nullen als 0, `Totals` |
| `atlasti-code-dokument-normalisiert.xlsx`, `atlasti-code-dokument-prozent.xlsx` | dasselbe, Option "Normalisieren" bzw. relative Häufigkeiten spaltenweise | **keine Zählungen**: Spalten summieren sich zu 1 bzw. 100 |
| `atlasti-zitate.xlsx` | ATLAS.ti: Zitate (Quotations) nach Excel exportieren | eine Zeile je Stelle: ID, Document, Code, Author (= Codierende), Start, End, Quotation Content |
| `nvivo-matrix.xlsx` | NVivo Hilfe "Coding matrices" (Matrix-Codierabfrage) | Codes × Fälle, ein Fall (`Interview_Weber`) ohne Codierung |
| `nvivo-fallklassifikation.xlsx` | NVivo "Classification Sheet" (Falleigenschaften) | Name, Alter, Geschlecht |
| `segmente.csv`, `segmente-ohne-codierende.csv` | Segmenttabelle (Dokument; Code; Beginn; Ende; Codierende) | alle 33 Stellen; die zweite ohne Codierenden-Spalte |

**REFI-QDA (`.qdpx`) entfällt in S-C** (Entscheidung Opus 4): es gibt keine echte Datei, und das XSD wurde nicht heruntergeladen.

**Bitte an Johannes:** von MAXQDA, ATLAS.ti und NVivo je ein kleines Projekt (3 Dokumente, 4 Codes, 2 Codierende) anlegen und die Code-Matrix bzw. Code-Dokument-Tabelle,
die Zitate und die Dokumentvariablen als Excel exportieren (und, wenn möglich, eine `.qdpx`-Datei), Ablage unter `qda/echt/`.
