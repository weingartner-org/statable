* NACHGEBAUT nach der SoSci-Survey-Hilfe (https://www.soscisurvey.de/help/doku.php/de:results:download), KEIN echter Export.
* Encoding: UTF-8.
* Daten und Befehle in einer Datei (SoSci: 'komfortabel als eine SPS-Datei'); die Datenzeilen sind keine Befehle.
DATA LIST LIST (';') / A001 (F2.0) A002_01 (F1.0) A003 (A30).
BEGIN DATA.
4;2;Gut
-9;1;SAVE OUTFILE
3;2;HOST COMMAND
END DATA.
VARIABLE LABELS A001 'Wie zufrieden sind Sie mit dem Seminar?' /A002_01 'Welche Medien nutzen Sie?: Fernsehen'.
VALUE LABELS A001 1 'sehr unzufrieden' 5 'sehr zufrieden' -9 'nicht beantwortet'.
MISSING VALUES A001 (-9).
EXECUTE.
