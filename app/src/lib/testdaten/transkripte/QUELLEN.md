# Quellen der Prüfdateien (Transkript-Leser, Paket 4A)

Stand 08.11.2026, Prüfer. Alle Inhalte sind erfunden (kurzes Gespräch über Semesterplanung, Namen „Erika Muster“, „Max Beispiel“). Keine echten Personen.
Die Dateien mit Zeilenende CRLF sind Absicht: Die Programme schreiben unter Windows so.
Die Sollwerte stehen in `<datei>.erwartet.json` (Prüfer; der Bauer darf sie nicht ändern). Weg 1 = Programm gelaufen, Weg 2 = echte Ausgabe-Funktionen aus dem Quelltext aufgerufen, Weg 3 = nach Doku nachgebaut.

Warum nie Weg 1: aTrain_core steht nicht auf PyPI (`pip download aTrain-core` findet nichts), braucht Modelle und für die Sprechererkennung ein Hugging-Face-Modell; noScribe braucht ein Modellpaket von mehreren GB und eine grafische Oberfläche. Beides nicht ohne Konto/Token und nicht in 45 Minuten. Darum Weg 2.

## aTrain (Weg 2)

- Programm: aTrain_core 1.4.1 (GitHub `JuergenFleiss/aTrain_core`, Tag v1.4.1, Quelltext `aTrain_core/outputs.py`, `version.py`). Lizenz: MIT (Copyright 2023 Haberl, Fleiß, Kowald, Thalmann).
- Vorgehen: `outputs.py` wurde mit Platzhaltern für numpy/pandas/yaml geladen und `create_output_files(result, speaker_detection, file_id)` (Zeilen 44-50) mit einem erfundenen Whisper-Ergebnis aufgerufen. Nichts nachgebaut: die Dateien sind die Ausgabe der echten Funktionen `create_json_file` (Z. 53), `create_txt_file` (Z. 60, drei Fassungen), `create_srt_file` (Z. 93). Das Ergebnis-Objekt hat die Form aus `transcribe.py` Z. 135 (`{"segments": [named_tuple_to_dict(s) …]}`, faster-whisper-Segment mit `words`) plus `speaker` je Segment und Wort (`assign_word_speakers`, Z. 209-256).
- `atrain-transcription.txt`: ohne Zeitmarken, mit Sprecherzeilen. `atrain-transcription_timestamps.txt`: je Segmentzeile `[hh:mm:ss] - `. `atrain-transcription_maxqda.txt`: Fassung für MAXQDA (Segmente eines Sprechers in einer Zeile, getrennt durch Leerzeichen, am Ende ein Leerzeichen, letzte Zeile ohne Zeilenende). `atrain-transcription-ohne-sprecher.txt`: Aufruf mit `speaker_detection=False`. `atrain-transcription.srt`, `atrain-transcription.json` (auf einer Zeile, `ensure_ascii=False`).
- **Wichtig, weicht vom Fachblatt ab:** aTrain schreibt den Sprecher als **eigene Zeile ohne Doppelpunkt** (`SPEAKER_00`, Z. 84), nicht als `SPEAKER_00:`; die erste Zeile ist eine Überschrift `Transcription for <Kennung>`; die SRT-Datei enthält **keinen** Sprecher (Z. 111-112). Ohne Sprechererkennung wäre `Speaker undefined` möglich (Z. 81), wenn ein Segment keinen Sprecher hat.
- Zeitgrenzen im TXT: nur Sekunden, abgerundet (`time.gmtime`, Z. 88), kein Ende.

## noScribe (Weg 2)

- Programm: noScribe 0.8 (GitHub `kaixxx/noScribe`, Tag v0.8, `noScribe/main.py` und `noScribe/utils.py`). Lizenz: GPL-3.0 (`LICENSE.txt`).
- `noscribe-transkript.html`: Dokument aufgebaut wie in `main.py` Z. 2897-2958 (Kopf, Titelabsatz, Infoabsatz) und `on_segment` Z. 3060-3200 (Anker `<a name="ts_<start>_<ende>_<Sprecher>">`, Zeit in Millisekunden; Sprechername und Zeitmarke `[hh:mm:ss]` im ersten Anker des Absatzes; Pausenanker ` (...)` bei Pause von 3 s). Der Aufbau ist mit AdvancedHTMLParser nachgespielt (gleiche Bibliothek wie im Programm), die Standardvorlage `default_html` direkt aus `main.py` Z. 95-113 gelesen. Das ist Weg 2 (Erzeugung nachgestellt, nicht das ganze Programm gelaufen).
- `noscribe-transkript.txt` und `noscribe-transkript.vtt`: Ausgabe der **echten** Funktionen `utils.html_to_text` (Z. 166) und `utils.html_to_webvtt` (Z. 252) auf dem so gebauten Dokument. Das VTT wurde ohne Pausen und ohne Zeitmarken gebaut (noScribe verbietet beides für VTT, `main.py` Z. 740). Auffällig: `WEBVTT Semesterplanung` (Titel in der Kopfzeile), `NOTE`-Block, `<v S00>` **ohne** schließendes `</v>`, Cue-Nummern.
- `noscribe-mit-skript.html`: wie die HTML-Datei, aber von Hand mit `<script>` und einem Bild mit `onerror` im ersten Absatz. Kein Programm-Erzeugnis; nur für den Sicherheitstest.

## Microsoft Teams (Weg 3, nachgebaut)

- `teams-nachgebaut.vtt`: nach öffentlichen Beispielen exportierter Teams-Transkripte (WebVTT, Cue-Kennung `<GUID>/<n>-0`, Sprecher als `<v Name>…</v>`). Eine Hersteller-Spezifikation der Kennungen wurde nicht gefunden; die Kennung ist darum aus der Erinnerung an echte Dateien nachgebaut. Lizenz: nicht zutreffend (Eigenbau).

## Zoom (Weg 3, nachgebaut)

- `zoom-nachgebaut.vtt`: nach dem bekannten Aufbau der Zoom-Cloud-Transkripte (Cue-Nummer, Zeit, `Name: Text`). Eigenbau.

## WebVTT allgemein, SRT-Verhalten

- `vtt-ohne-sprecher.vtt`: Eigenbau nach der WebVTT-Spezifikation (W3C). Pausen zwischen den Cues: 100 ms, 3000 ms, 500 ms, genau 2000 ms; ein Cue mit zwei Textzeilen.
- `vtt-grenzfaelle.vtt`: Eigenbau nach W3C-WebVTT: `NOTE`, `STYLE`, `REGION`, Cue-Kennung, Cue-Einstellungen, `<c.yellow>`, `<i>`, `<b>`, Zeit-Tag `<01:12.500>`, Entities `&amp; &lt; &gt;`, Zeiten ohne Stunden, leerer Cue.
- `vtt-zeit-rueckwaerts.vtt`: Eigenbau, zweiter Cue beginnt vor dem ersten.

## f4transkript und Word (Weg 3, nachgebaut)

- `f4-transkript.txt`, `f4-transkript-nachgebaut.docx`: nach dem Handbuch f4transkript Version 5.40.0 (Stand März 2015, Uni Bremen, `blogs.uni-bremen.de/lingwerk/files/2016/01/f4_manual_de.pdf`), Kapitel 3.3 (Seite 10-11): „Am Ende jedes Absatzes wird eine Zeitmarke angezeigt.“ Voreinstellung am Absatzende; **wählbar auch Absatzanfang oder nur manuell (F8)**; Format aus `HH`, `MM`, `SS`, `m` (Zehntelsekunde) mit frei wählbaren Begrenzern, das übliche `#HH:MM:SS-m#`. Sprecherkürzel `I:`/`B:` sind die üblichen aus dem Praxisbuch (Dresing/Pehl), nicht aus dem Handbuch. Die .docx entstand mit python-docx (je Absatz eine Zeile).

## Text und Grenzfälle (Eigenbau)

- `text-sprachmemo.txt`: Text ohne Sprecher und Zeit, drei Absätze.
- `text-fazit-einmal.txt` („Fazit:“ nur einmal, Uhrzeiten `10:30` am Zeilenanfang), `text-fazit-zweimal.txt` („Fazit:“ zweimal).
- `zeichensatz-utf8-bom.txt`, `zeichensatz-utf16le-bom.txt`, `zeichensatz-windows1252.txt` (ohne BOM, Umlaute als Ein-Byte-Zeichen), `zeichensatz-utf8-crlf.txt`: derselbe f4-Text mit Umlauten in vier Kodierungen.

## Meldungsarten (vom Prüfer festgelegt, Kennungen in `meldungsArten`)

`bom` (UTF-8-BOM entfernt), `zeichensatz` (Windows-1252 angenommen), `leer` (leere Beiträge weggelassen), `zeit-rueckwaerts`, `zu-gross` (mehr als 20 MB). Die Prüfung vergleicht die **Menge** der Arten (ohne Doppelte, sortiert), nicht die Sätze.

## Nachtrag nach den Entscheiden F1-F11 (08.11. abends)

- `f4-zeitmarke-absatzanfang.txt`, `f4-zeitmarken-gemischt.txt`, `f4-zeitmarke-mitten.txt`: Eigenbau nach f4-Handbuch 5.40 Kap. 3.3.1 (Marke am Absatzanfang, Absatzende oder von Hand mit F8). Stellung der Marke vor der Sprecherkennung (`#… # I: …`) ist angenommen; das Handbuch beschreibt sie nicht.
- `noscribe-ueberlappung.html`: aus der noScribe-HTML-Datei, Absätze ersetzt nach `main.py` Z. 3112-3120 (Anker `ts_<von>_<bis>_//S01`, Text ` //S01: …`, Rückkehr `//…`). Weg 2.
- `vtt-leerer-cue-pause.vtt`, `vtt-rueckwaerts-gleicher-sprecher.vtt`: Eigenbau nach W3C-WebVTT.
- `atrain-transcription-ohne-sprecher.txt`, `noscribe-transkript.txt` haben jetzt einen Sollwert (Entscheide F4, F5).
