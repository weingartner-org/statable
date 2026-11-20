# Fragebogen-Testdateien (Welle S-C, D4) - ALLE NACHGEBAUT, KEIN ECHTER EXPORT

Erzeugt von `scripts/spaeter-c-erwartet.R` (Rscript, aus dem Ordner pspp-web). Nicht von Hand ändern: Zahlen und erwartete Erkennung stehen in
`../spaeter-c-erwartet.json` (Abschnitt `fragebogen`); die Tests `fragebogen.test.ts`, `kodebuch.test.ts` und `spsssyntax.test.ts` lesen beides.

Es gibt auf diesem Mac und im Repo **keine echten Exporte** von SoSci Survey, LimeSurvey, Unipark oder Qualtrics. Die Dateien sind nach der
Herstellerdokumentation (und, wo sie nichts sagt, nach Erinnerung) nachgebaut. Wo die Form **nicht belegt** ist, steht es unten.

| Datei | nachgebaut nach | belegt / nicht belegt |
|---|---|---|
| `sosci-nachgebaut.csv` | SoSci Survey Hilfe: Ergebnisse herunterladen (`https://www.soscisurvey.de/help/doku.php/de:results:download`), Variablen (`...:results:variables`), Werte (`...:results:values`) | Spaltennamen, Codes (-9, -1 bis -3, -8; Mehrfachauswahl 1 = nicht gewählt, 2 = gewählt) belegt; Trennzeichen `;` und Anführungszeichen nachgebaut |
| `sosci-nachgebaut.sps` | wie oben ("eine SPS-Datei mit Variablen, Daten und Labels") | Aufbau (GET DATA, VARIABLE LABELS, VALUE LABELS, MISSING VALUES) aus Erinnerung; die echte Engine liest die Datei fehlerfrei (Gegenprobe im Test) |
| `sosci-nachgebaut-unbekannter-befehl.sps` | dieselbe Datei plus `HOST`, `INSERT`, `ERASE`, `SAVE`: Test des Whitelist-Lesers | erfunden zum Prüfen; nichts davon darf ausgeführt werden |
| `sosci-nachgebaut-eine-datei.sps` | Daten und Befehle in einer Datei (`BEGIN DATA ... END DATA`) | die Datenzeilen enthalten absichtlich die Wörter `SAVE` und `HOST` |
| `limesurvey-code-text.csv`, `limesurvey-volle-antworten.csv` | LimeSurvey Handbuch "Exporting results" und "Export responses" (`https://www.limesurvey.org/manual/Exporting_results`) | Spalten `id, submitdate, lastpage, startlanguage` und Überschrift "Fragecode. Fragetext" belegt; `seed`, `startdate`, `datestamp` und `Y`/leer bei Mehrfachauswahl aus Erinnerung |
| `unipark-nachgebaut.csv`, `.xlsx`, `-missing.sav`, `-ohne.sav` | Tivian/Unipark: Codes -77, 0, -66, -99 (nur ein Suchauszug), Uni Trier EFS-Handbuch | **Systemvariablen (lfdn, tid, dispcode ...) und Mehrfach-Kodierung NICHT belegt**. Echte Datei von Johannes (Uni-Konto) nötig. Die `.sav`-Dateien schreibt die PSPP-Engine |
| `qualtrics-numerisch.csv`, `qualtrics-text.csv`, `qualtrics-minus99.csv` | Qualtrics Support "Data Export Options" und "Understanding Your Dataset", SSCC Wisconsin "Downloading Data from Qualtrics" | drei Kopfzeilen, Standardspalten, Status 0/1, Importregel Mehrfachspalten belegt; Texte der Zeile 2 und die ImportIds der Fragen nachgebaut |
| `unbekannt-codes.csv` | kein Hersteller: Hinweise auf Codes wie -9, -99, 99, 999 in Spalten mit Werten von 0 bis 10 (Entscheidung Opus 3) | erfunden zum Prüfen |

IP-Adressen sind aus dem für Dokumentation reservierten Bereich (192.0.2.x), E-Mail-Adressen `@example.org`.

**Bitte an Johannes:** je Werkzeug einen kleinen Testfragebogen (1 Skala 1-5 mit einer unbeantworteten Frage, 1 Mehrfachauswahl mit 3 Optionen, 1 Textfeld,
1 Testantwort, 1 abgebrochene Antwort, 6 Antworten) exportieren, in **allen** Formaten, die das System anbietet, und unter `fragebogen/echt/` ablegen.
Dann werden diese Nachbauten durch die echten Dateien ersetzt oder ergänzt.
