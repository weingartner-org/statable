# Herkunft der fremden Codebuch-Dateien (Lesetest für `qdc.ts`)

Beide Dateien stammen aus dem Projekt **Ornio-app/qdpx-toolkit** (https://github.com/Ornio-app/qdpx-toolkit, Lizenz **MIT**, per GitHub-Schnittstelle bestätigt, 08.11.2026). Es gab dort keine eigenständige `.qdc`; das `CodeBook`-Stück wurde aus einer Projektdatei herausgelöst und nur so verändert, dass es eine eigenständige Codebuch-Datei ist: Wurzel `CodeBook` mit dem Namensraum `urn:QDA-XML:codebook:1.0` statt des Projekt-Namensraums, XML-Kopfzeile. Inhalt der Codes unverändert.

| Datei | Herkunft | Besonderheit |
|---|---|---|
| `ornio-handgeschrieben.qdc` | `tests/fixtures/hand_authored/project.qde` (von Hand geschrieben) | Baum über drei Ebenen, `isCodable="false"` bei der Oberkategorie, `Description`, Farben klein geschrieben |
| `atlasti-26-zwei-codes.qdc` | `conformance/fixtures/atlasti/atlasti_26_handbuilt_02_codes_memos.qdpx` (echter ATLAS.ti-26-Export, Datei `Trial.qde`) | GUIDs in Großbuchstaben, zwei flache Codes, `origin` mit Programmname; im Original stand das Codebuch im Projekt neben Quellen und Codierungen |

Nicht aufgenommen: `tools/python/qdc_converter/example_codebook.qdc` aus openqda/refi-tools (Repository AGPL-3.0, für die Einzeldatei kein eigener Vermerk; die GUIDs sind dort keine GUIDs, sondern `c001`, `c21`). Das XSD selbst liegt nicht im Git (`docs/erheben/recherche-refi-qda.md`).
