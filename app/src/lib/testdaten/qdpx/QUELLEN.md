# Herkunft der Prüfdateien für `qdpx.ts` (Lesetest und Sollwerte)

Alle Dateien sind `.qdpx` (ZIP mit einer `.qde` und `sources/`). Zu jeder Datei liegt `<datei>.erwartet.json`: die Sollwerte, erzeugt vom **unabhängigen Python-Leser** `scripts/qdpx-erwartet.py` (lxml, zipfile; nicht aus TypeScript). Dazu `zusammen.erwartet.json` für das Zusammenführen. Neu erzeugen: `python scripts/qdpx-pruefdateien.py [--fremd ORDNER]`, danach `python scripts/qdpx-erwartet.py`.

Die XSD (`Project.xsd`) liegt **nicht** im Git (Lizenz der Einzeldatei nicht klar). Das Skript prüft jede als gültig gekennzeichnete `.qde` dagegen (Ordner aus `REFI_XSD_DIR`, sonst `C:\Users\johan\AppData\Local\Temp\refi-xsd`; Quelle `https://raw.githubusercontent.com/openqda/refi-tools/main/docs/schemas/project/v1.0/Project.xsd`). Stand 09.11.2026: alle 35 gültigen Dateien bestehen (die zwei mit abweichendem Namensraum nach dem Tausch auf `…:1.0`).

## Aus der Spezifikation REFI-QDA 1.5 (PDF, MIT-Lizenz laut Seite 3, © 2019 REFI-QDA)

Quelle: https://openqda.github.io/refi-tools/docs/standard/REFI-QDA-1-5.pdf. Die Spezifikation druckt im Anhang nur die XML, **nicht die Quelltexte** (`sources/*.txt`). Beide Texte sind deshalb **von uns ergänzt**:

| Datei | Inhalt | Was ergänzt ist |
|---|---|---|
| `spec-beispiel-2-einfach.qdpx` | Anhang A.2 „Simple project“ (ATLAS.ti 8.4): 6 Textquellen, 2 PDF-Darstellungen, 3 Video-/Audioquellen mit Transkripten, Bild, Notizen, Link, 16 Mengen, Graph | Die `.qde` ist unverändert die aus `sky-loom-TestProject.qdpx` (dort inhaltlich wie in der Spezifikation; Byte-Vergleich mit dem PDF ist nicht möglich). Die 8 Klartexte sind **erfunden**, so gebaut, dass jede Auswahl an ihrer Stelle genau mit dem `name`-Text der Spezifikation beginnt (z. B. „granola“ bei 62 bis 69, Simon.docx 215 bis 275, 513 bis 907, 688 bis 907). Ablage wie im Dateibaum der Spezifikation: `Sources/<GUID>.TXT` (große Anfangsbuchstaben, Endung groß, Pfad in der XML klein: der Leser muss Groß-/Kleinschreibung beim Suchen ignorieren). |
| `spec-beispiel-3-komplex.qdpx` | Anhang A.3 „Complex project“ (Transana): **verkleinert nachgebaut**: 3 Autoren, Codebuch mit Gruppen und Schlüsselwörtern, `NoteRef` an Codes, Auswahl und Dokument, Kodierung an der ganzen Quelle, Namensraum `urn:QDA-XML:project:0:10` | Die Spezifikation druckt hier rund 25 Seiten XML (mit zerstörten Sonderzeichen im PDF-Text); Struktur und Namen stammen aus ihr, Texte sind erfunden. Auswahl-Namen („English Quote 1“) sind Bezeichnungen, keine Textproben. Die Kodierung an der ganzen Quelle trägt hier ein `creatingUser` (Autor), damit die Person eindeutig ist (im Original fehlt es). Gegen die XSD gültig erst nach Tausch des Namensraums. |

## Freie Dateien (alle im Original unter MIT; Lizenz je Repository per GitHub-Schnittstelle am 09.11.2026 geprüft und dem `LICENSE`-Text entnommen)

| Datei | Herkunft | Lizenz | Veränderung |
|---|---|---|---|
| `sky-loom-TestProject.qdpx` | https://github.com/sky-loom/refi-qda, `TestProject.qdpx` (Stand 28.04.2025) | MIT, © 2025 sky-loom | keine. Enthält die Spezifikations-XML **ohne** Texte (`Sources/` leer): Test für „Quelle fehlt“. |
| `ornio-atlasti26-01-baseline.qdpx` | https://github.com/Ornio-app/qdpx-toolkit, `conformance/fixtures/atlasti/atlasti_26_handbuilt_01_baseline.qdpx` (Stand 20.09.2026) | MIT, © 2026 Ornio.app | keine. Echter ATLAS.ti-26-Export, `Trial.qde` (nicht `project.qde`), nur Video, eine `VideoSelection`. |
| `ornio-atlasti26-02-codes-memos.qdpx` | dasselbe Repo, `…_02_codes_memos.qdpx` | MIT, © 2026 Ornio.app | keine. Zwei Codes, 8 Zeit-Auswahlen am Video, kein Text. |
| `ornio-handgeschrieben.qdpx` | dasselbe Repo, `tests/fixtures/hand_authored/project.qde` | MIT, © 2026 Ornio.app | Die rohe `.qde` ist **unverändert** in eine `.qdpx` verpackt; der Klartext `sources/11111111-1111-1111-1111-111111111111.txt` („Diet and health are closely linked.“) ist von uns **ergänzt**, damit die Auswahlen 0 bis 15 und 9 bis 23 passen. Enthält Fall mit Variablen, PDF mit Darstellung, Audio mit Transkript und Synchronpunkten, Video, Bild, Link, Graph, Menge mit Code und Dokument. |
| `qualia-sample-import.qdpx` | https://github.com/mrlnlms/obsidian-qualia-coding, `tests/e2e/vaults/visual/sample-import.qdpx` (Stand 03.09.2026) | MIT, © 2026 Marlon Lemes | keine. Keine echten GUIDs (`c-joy`, `src-1`), keine Benutzer, `NoteRef` an einer Kodierung, Auswahlen ohne Namen. |

Prüfsummen der heruntergeladenen Originale (SHA-256, Anfang): sky `84336f0d…`, ornio b01 `26f5502e…`, ornio b02 `eae6d0c1…`, ornio project.qde `d33093fb…`, qualia `d4751ba4…`.

Nicht aufgenommen: `enricllagostera/ponte` (keine Lizenzangabe), `Computational-Ethnography-Lab/cmap_qdpx_converter` (Lizenz unklar), QDR-Projekte (Nutzungsvertrag, nicht frei).

## Eigene Grenzfälle (alle erfunden, `scripts/qdpx-pruefdateien.py`; Positionen aus Textstellen per Suche in Codepoints, nie von Hand gezählt)

| Datei | Prüft |
|---|---|
| `crlf-maxqda`, `crlf-atlasti-mit-namen`, `crlf-atlasti-ohne-namen`, `crlf-maxqda-ohne-namen`, `crlf-atlasti-kurze-namen` | `\r\n` als 2 Zeichen (MAXQDA) oder 1 (ATLAS.ti), mit und ohne `name`-Textproben, Namen unter 8 Zeichen, Entscheidung über `origin` |
| `bom-nicht-gezaehlt`, `bom-gezaehlt` | BOM am Anfang der `.txt`: Positionen ohne BOM oder mit BOM als Zeichen 0 |
| `emoji-akzent` | Emoji, ZWJ-Familie (5 Codepoints, 8 UTF-16-Einheiten), kombinierender Akzent, NFD-Umlaut vor Segmenten |
| `qde-anderer-name`, `zwei-qde-mit-project` | `.qde` heißt „Interviews 2026.qde“; zwei `.qde`, davon eine `project.qde` |
| `guid-schreibweisen` | GUIDs groß mit `{}` und Verweise klein ohne `{}` |
| `plaintextcontent`, `quelle-fehlt` | `PlainTextContent` statt Datei; fehlende `internal://`-Datei, `relative://`, `absolute://` |
| `segment-grenzen`, `guid-unbekannt`, `kodierende` | Segment hinter dem Ende, Start gleich Ende, Start größer Ende, negativ, Start gleich Länge; unbekannte `targetGUID`; Coding ohne `creatingUser`, User ohne `name` |
| `faelle-variablen`, `dokumentvariablen` | Variablen aller sechs Typen, Fall ohne Namen mit einer Quelle, Dokumentvariablen ohne Fall |
| `memos`, `mengen`, `nicht-gelesen`, `doppelte-namen`, `namensraum-0-10`, `script-text`, `zwei-kodierende` | Notizen mit `NoteRef` an Projekt/Dokument/Code/Auswahl, `Description` an Auswahl; Mengen; Bild/PDF-Fläche/Audio-Zeit/Link/Graph; doppelte Dokumentnamen; abweichender Namensraum; `<script>` im Text; zwei Kodierende auf derselben Stelle |
| `transkripte-quellcoding` | Audio mit zwei Transkripten (zwei Dokumente), Kodierung direkt an der Quelle (Segment über das ganze Dokument), Auswahl ohne Kodierung mit Kommentar |
| `zusammen-a`, `zusammen-b`, `zusammen-c` | Zusammenführen: gleiche Texte, ein Dokument gleichen Namens mit anderem Text, Codes teils mit gleicher GUID, teils nur gleichem Pfad (andere Schreibweise), Personen gleichen Namens mit verschiedener GUID, gleiche Person mit gleicher GUID (Carla), gleicher Text unter anderem Namen (Interview 5), Fall mit verschiedenem Variablenwert; `zusammen-c`: Datei ohne Kodierende (Person „Datei 2“) |
| `fehler-*` | Absichtlich abzulehnen (nicht gegen die XSD geprüft): `kein-zip`, `keine-qde` (auch `.qde` nur im Unterordner), `mehrere-qde`, `doctype`, `kaputt`, `wurzel` (Codebuch-Wurzel, fremder Namensraum). `zugross` wird im Test künstlich erzeugt. |

## Gegenprobe mit pyrefiqda (MIT)

`pyrefiqda` 0.3.1 (pip) lädt die Stichproben `crlf-maxqda`, `emoji-akzent`, `memos`, `faelle-variablen`, `zusammen-b`, `spec-beispiel-2-einfach`, `ornio-handgeschrieben` ohne Fehler; die Zahl der Benutzer stimmt mit den Sollwerten überein. Positionen und Texte liest es nicht auf, darum zählt dafür nur der eigene Python-Leser.

## Entscheide (Opus, 09.11.2026), nach denen die Sollwerte gebaut sind

Textprobe nur, wenn der Name im Dokumenttext vorkommt; Gleichstand der Zählweisen nach `origin`; Auswahl ohne Kodierung bleibt Segment; Kodierung an der Quelle = Segment [0, Länge); je Transcript ein Dokument; Note ohne NoteRef → Projekt; NoteRef an Kodierung → Segment; gemischte Menge → zwei Mengen; „Person n“ zählt nur die Unbenannten; Zusammenführen: gleicher Text = dasselbe Dokument, gleiche GUID = gleiche Person, Datei ohne Kodierende = Person „Datei 2“. Die Sollwerte lassen keinen Spielraum mehr.
