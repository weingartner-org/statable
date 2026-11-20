# Prüfdateien der Befragungsdienste (Paket 1A/1B/1C) - NACH DOKUMENTATION BZW. QUELLCODE ERZEUGT, NICHT AN ECHTEN EXPORTEN GEPRÜFT; ANTWORTEN ERFUNDEN

Alle Antworten, Namen (Anna Beispiel, Ben Muster …) und Adressen (`@example.org`) sind erfunden. Die Dateien entstehen reproduzierbar mit
`node src/lib/testdaten/dienste/erzeugen.mjs` (aus dem Ordner `app`; exceljs, feste Zeitstempel - der Inhalt ist bei jedem Lauf gleich, die Bytes der
XLSX-Dateien nicht, weil das ZIP eigene Zeiten schreibt). Spezifikation: `docs/erheben/KOPFZEILEN-DIENSTE.md` (dort steht je Angabe [gelesen] oder [Suche]).
Tests: `dienste-1b.test.ts`, `fragebogenplan-1c.test.ts`.

**Was die Dateien NICHT zeigen, weil es in der Spezifikation „unbekannt“ ist (nicht erfunden):** deutsche Kopfzeilen von Google, Microsoft, Moodle;
E-Mail-Spalte bei Google; Trennzeichen der Google-, Nextcloud- und Moodle-CSV (hier jeweils Komma, nur Platzhalter); Blattnamen (hier „Sheet1“);
Zeitzelle bei Microsoft (hier ein Excel-Datumswert); „Sonstiges“ bei Microsoft; Mehrfachauswahl bei CryptPad und ODK; Rangfolge bei Kobo;
Spaltenkopf von Checkbox-Optionen bei Moodle (nur teilweise belegt); ODK-Systemspalten.

| Datei | Merkmal | Quelle in KOPFZEILEN-DIENSTE.md |
|---|---|---|
| `googleforms/googleforms-en.csv` | erste Spalte `Timestamp`, Zellen `8/6/2023 9:34:20` (ohne Zone) | 1 (2), (3): Stack-Overflow-Beispiel [gelesen] |
| | Mehrfachauswahl `Breakfast, Lunch`; Raster `Rate the canteen [Food]` | 1 (4) [gelesen] |
| | „Sonstiges“-Text im Mehrfachfeld (`Late snack`; `Soda, Cola` mit Trenner); Option mit Trenner (`Yes, any way`) | 1 (4) „Sonstiges“, (6) Komma in Optionen: nur Schluss/[Suche] |
| | doppelte Zeile (alle Spalten gleich), leere Zelle | 1 (5): keine ID, nur „alle Spalten gleich“ |
| `msforms/msforms-en.xlsx` | Köpfe `ID`, `Start time`, `Completion time`, `Email`, `Name` (Reihenfolge Email vor Name nach Office Watch; die Microsoft-Prosa sagt Name vor E-Mail, widersprüchlich) | 2 (2) [gelesen] |
| | Mehrfachauswahl `Breakfast;Lunch;` (`;` ohne Leerzeichen, am Ende immer `;`) | 2 (4) [gelesen, Forumsbericht] |
| | Zeitzellen als Excel-Datumswerte in UTC (Beispielwerte erfunden) | 2 (3) [gelesen], „may“ |
| | gleiche `ID` (2) zweimal = wiederholter Export | 2 (5) [gelesen] |
| `nextcloud/nextcloud-en.csv`, `-de.csv` | UTF-8 mit BOM | 3 (1) [gelesen: Code `setUseBOM(true)`] |
| | Köpfe `Submission ID, User ID, User display name, Timestamp` bzw. `Einreichungs-ID, Benutzer-ID, Anzeigename des Nutzers, Zeitstempel` | 3 (2) [gelesen: Code, l10n] |
| | ISO-Zeit `2026-11-08T10:15:30+01:00` | 3 (3) [gelesen: PHP `c`] |
| | anonym: `User ID` leer, `Anonymous user` / `Anonymer Benutzer` | 3 (2) [gelesen] |
| | Mehrfachauswahl `; `; Raster `Frage (Zeile)` | 3 (4) [gelesen: Code] |
| | `system-other-answer:` am Anfang eines Teils; Anderes-Text mit `; ` | 3 (4) „Sonstiges“: ob das Präfix in der Zelle steht, ist unbekannt (hier angenommen, weil der Erkenner damit rechnen soll) |
| `cryptpad/cryptpad-en.csv`, `-de.csv` | Köpfe `Time`, `Participant` bzw. `Zeit`, `Teilnehmer`; ISO mit `Z` und Millisekunden; `Guest`/`Gast` | 4 (2), (3) [gelesen: Code, messages.json] |
| | Raster `Frage \| Zeile`; Datumsfrage als ISO-String; Anführungszeichen bei `"`, `,`, `;` (innere `"` verdoppelt) | 4 (1), (4) [gelesen: Code `escapeCSV`] |
| `cryptpad/cryptpad-en.json`, `-de.json` | oberste Ebene `questions`, `responses`; Antworten mit `_time`, `_name`, `q1`, `q2` | 4 (2) [gelesen: Code]. **Der Inhalt der Frageobjekte (`{ "q": … }`) ist erfunden**, `responses` als Liste ist angenommen |
| `kobo/kobo-xml-eins-null.xlsx` | „XML values and headers“, Gruppen mit `/` (`besuch/zufrieden`), Mehrfachauswahl als Spalte mit Leerzeichen UND je Option `gruppe/frage/option` mit 1/0 | 5 (4) [gelesen: Kobo-Hilfe, Forum 75288, 3112] |
| | Systemspalten `start`, `end`, `__version__`, `meta/instanceID`, `_id`, `_uuid`, `_submission_time`, `_validation_status`, `_notes`, `_status`, `_submitted_by`, `_tags`, `_index` | 5 (2) [gelesen] / [Suche] (`__version__`) |
| | Zeitformate `…+02:00` (start/end) und `…` bzw. `+00:00` (`_submission_time`) | 5 (3) [Suche] |
| | `besuch/verkehr_other` für `or_other`, Wert `other` in `besuch/verkehr` | **Kobo-Form unbekannt**; hier nach XLSForm/pyxform (`<name>_other`) |
| | Spalte `zusatz_unbekannt` | erfunden, damit der Test „nicht zuordenbar“ prüft |
| `kobo/kobo-xml-true-false.csv` | nur getrennte Spalten, Werte `True`/`False`, Trenner `;` | 5 (1), (4) [gelesen: Forum, nur Frage ohne Antwort] |
| `moodlequestionnaire/moodlequestionnaire.csv` | Köpfe `Response, Submitted on:, Institution, Department, Course, Group, User id, User idnumber, Full name, Username`; Zeit `08/11/2026 10:15:30` (`d/m/Y H:i:s`); Fragen `Q01_zufriedenheit`; Zelle = Code (`choicecodes`) | 8 (2), (3), (4) [gelesen: Code, Sprachdatei] |
| | Checkbox je Option `Q02_mahlzeiten->fruehstueck` mit 1/0 | 8 (4): Muster `Optionsname->…` **nur unvollständig gelesen** |
| `moodlequestionnaire/moodlequestionnaire-anonym.csv` | Name `Anonymous1…`, `User id` und `Username` leer; übrige Profilfelder leer gelassen (dort nicht belegt) | 8 (2) [gelesen: Code, Hilfe] |
| `xlsform/mensa.xlsx` | passt zu beiden Kobo-Dateien: Blätter `survey`, `choices`, `settings`; `label::Deutsch (de)`, `label::English (en)`, `hint::…`; `select_one`, `select_multiple`, `integer`, `decimal`, `text`, `date`, `range` (`parameters`), `rank`, `acknowledge`, `note`; `begin_group`; `required`; `relevant`; `or_other`; Namen als Text (`bus`) und als absteigende ganze Zahlen (`5 … 1`) | Fachblatt 1C; XLSForm-Standard (xlsform.org) |
| `xlsform/mensa-grenzfaelle.xlsx` | `label` ohne Sprache neben `label::English (en)`; Liste mit gemischten Namen (`3`, `1`, `andere`); fehlende englische Beschriftung (Frage und Option); `choice_filter` | Fachblatt 1C „Grenzfälle“ |
| `xlsform/mensa-geopoint.xlsx` | `geopoint`, `image`, `calculate`, `begin_repeat` (nicht unterstützt, gültig in XLSForm) | Fachblatt 1C „Andere Typen“ |

## Gegenprobe XLSForm mit pyxform 4.5.0 (`py -3 -m pyxform.xls2xform <datei> <aus.xml> --skip_validate`, 08.11.2026)

| Datei | Ergebnis |
|---|---|
| `xlsform/mensa.xlsx` | **angenommen** („Conversion complete!“). Warnung: „This form uses or_other and translations, which is not recommended. An untranslated input question label and choice label is generated for 'other'.“ pyxform legt für `or_other` automatisch die Wahl `other` und die Frage `verkehr_other` an; `rank` erzeugt `odk:rank`. |
| `xlsform/mensa-grenzfaelle.xlsx` | **angenommen**, keine Warnung. pyxform nennt die Sprache der Spalte `label` ohne Zusatz `default` (`<translation lang="default" default="true()">`), daneben `English (en)`. |
| `xlsform/mensa-geopoint.xlsx` | **angenommen** (`geopoint` ist gültig in XLSForm; nur Statable überspringt den Typ). Warnung: „Use the max-pixels parameter … image“. |

Alle drei gelten damit als gültige Prüfdateien. Nicht getan: `--odk_validate` / `--enketo_validate` (brauchen Java bzw. Enketo), und keine öffentlich lizenzierte
XLSForm aus der ODK-/Kobo-Dokumentation (Fachblatt 1C verlangt mindestens eine; das trägt Paket 1C nach, siehe unten).

## Öffentlich lizenzierte XLSForm (Paket 1C, Nachtrag, 08.11.2026)

| Datei | Herkunft | Lizenz | Gegenprobe |
|---|---|---|---|
| `xlsform/pyxform-widgets.xlsx` | Repository XLSForm/pyxform, `tests/fixtures/example_forms/widgets.xlsx` (Zweig master, letzte Änderung der Datei: Commit `c3a08bca785acb32463716279480349305906fb3`, 17.07.2026), unverändert übernommen, 12.746 Bytes | pyxform steht unter der BSD-2-Clause-Lizenz (Copyright (c) 2015, XLSForm; `LICENSE` im Repository): Weitergabe mit Hinweis auf das Urheberrecht und den Haftungsausschluss erlaubt. Dieser Absatz ist der Hinweis. Die Datei ist keine Erfindung von Statable. | pyxform 4.5.0, `py -3 -m pyxform.xls2xform <datei> <aus.xml> --skip_validate`: **angenommen** („Conversion complete!“). Warnungen: `happy_sad`-Antworten ohne Beschriftung (Zeilen 23 und 24 der Antwortliste), `image` ohne `max-pixels`. |

Die Datei benutzt alte Typnamen, die pyxform kennt (`string`, `int`, `trigger`, `select one from list`, `select all that apply from list`, Blatt `choices` mit Spalte `list name`) und Typen, die Statable
überspringt und meldet (`geopoint`, `barcode`, `image`, `audio`, `video`, `time`, `dateTime`). Test: `fragebogenplan-oeffentlich.test.ts` (liest ohne Ausnahme). Es ist keine Datei aus der ODK- oder
Kobo-Dokumentation selbst, sondern aus dem Beispielsatz des XLSForm-Werkzeugs pyxform (gleiche Form, öffentlich, mit Lizenz); eine Datei aus der Dokumentation zu suchen, bleibt offen.
