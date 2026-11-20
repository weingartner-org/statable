* NACHGEBAUT nach der SoSci-Survey-Hilfe (https://www.soscisurvey.de/help/doku.php/de:results:download), KEIN echter Export.
* Encoding: UTF-8.
SET DECIMAL=DOT.
GET DATA /TYPE=TXT
  /FILE='sosci-nachgebaut.csv'
  /DELCASE=LINE
  /DELIMITERS=";"
  /QUALIFIER='"'
  /ARRANGEMENT=DELIMITED
  /FIRSTCASE=2
  /VARIABLES=
  CASE F5.0
  SERIAL A20
  REF A20
  QUESTNNR A20
  MODE A10
  STARTED A19
  A001 F2.0
  A002_01 F1.0
  A002_02 F1.0
  A002_03 F1.0
  A003 A100
  TIME001 F5.0
  TIME002 F5.0
  TIME_SUM F5.0
  TIME_RSI F5.2
  MISSING F3.0
  MISSREL F5.2
  FINISHED F1.0
  LASTPAGE F2.0
  MAXPAGE F2.0.
VARIABLE LABELS CASE 'Interview-Nummer (fortlaufend)'
  /SERIAL 'Seriennummer (sofern verwendet)'
  /MODE 'Interview-Modus'
  /A001 'Wie zufrieden sind Sie mit dem Seminar?'
  /A002_01 'Welche Medien nutzen Sie? (Mehrfachauswahl): Fernsehen'
  /A002_02 'Welche Medien nutzen Sie? (Mehrfachauswahl): Radio'
  /A002_03 'Welche Medien nutzen Sie? (Mehrfachauswahl): Internet'
  /A003 'Was hat Ihnen gefehlt?'
  /FINISHED 'Fragebogen beendet (letzte Seite erreicht)'.
VALUE LABELS A001
  1 'sehr unzufrieden'
  2 'unzufrieden'
  3 'teils/teils'
  4 'zufrieden'
  5 'sehr zufrieden'
  -9 'nicht beantwortet'
  -1 'keine Angabe'.
VALUE LABELS A002_01 1 'nicht gewählt' 2 'gewählt'.
VALUE LABELS A002_02 1 'nicht gewählt' 2 'gewählt'.
VALUE LABELS A002_03 1 'nicht gewählt' 2 'gewählt'.
VALUE LABELS FINISHED 0 'abgebrochen' 1 'beendet'.
MISSING VALUES A001 (-9,-1).
VARIABLE LEVEL A001 (ORDINAL) /A002_01 A002_02 A002_03 (NOMINAL) /TIME_SUM (SCALE).
FORMATS A001 (F2.0) /TIME_RSI (F5.2).
EXECUTE.
