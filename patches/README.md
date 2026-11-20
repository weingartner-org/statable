# Änderungen an GNU PSPP für Statable

Seit 29.10.2026: **PSPP 2.1.3** (Tarball `ftp.gnu.org/gnu/pspp/pspp-2.1.3.tar.gz`, quellgleich mit Git-Tag `v2.1.3`)
plus zwei Upstream-Commits nach dem Release. Davor 2.1.1 mit eigenen Fehlerbehebungen. Die sind alle in PSPP übernommen
(Melder Johannes Weingartner) und stehen hier nicht mehr.

| Datei | Was | Anwenden |
|---|---|---|
| `0001-engine-aenderungen.diff` | Anpassung an WebAssembly: JSON-Treiber anmelden (`driver.c`), stdin nicht blockieren (`u8-istream.c`), Emscripten ohne Locale-Abfrage (`gl/getlocalename_l-unsafe.c`) | im Quellbaum `patch -p0` |
| `json.c` | Ausgabe-Treiber JSON, wird von `driver.c` eingebunden | nach `src/output/json.c` kopieren |
| `0002-upstream-examine-nach-2.1.3.patch` | Upstream `346d7c0` (EXAMINE: Normalitätstest ohne Faktor) und `80ddaf8` (EXAMINE /CINTERVAL in Prozent wie SPSS), nur `src/` | im Quellbaum `patch -p1`; entfällt mit dem nächsten Release |

Bauen: `bash wasm/engine-bauen.sh ~/Entwicklung/pspp-bau 2.1.3` (Ablauf im Kopf des Skripts).

## Was früher hier stand und jetzt in PSPP ist

| alt | Befund | in PSPP |
|---|---|---|
| `0002-crosstabs-alle-zellen.diff` | CROSSTABS /CELLS=ALL bricht ab | `2cd1f85`, in 2.1.3 |
| `0003-faktorenanalyse-eigenvektoren-sortieren.diff` | FACTOR nimmt unsortierte Eigenvektoren | `7f78e10`, in 2.1.3 |
| `0004-examine-normalitaet-ohne-faktor.diff` | EXAMINE Normalitätstest ohne Faktor in falscher Zeile | `346d7c0`, nach 2.1.3 (hier als 0002) |

## Nächster Umstieg

1. `git log --stat v2.1.3..<neu> -- src/` lesen: welche Befehle ändern sich? Für diese gezielt gegen R und SPSS prüfen.
2. Steht dort eine Korrektur, die Statable bisher selbst ausgleicht (`app/src/engine/korrektur.ts`, `app/src/lib/spssangleich.ts`,
   `docs/PSPP-BEFUNDE.md`), prüfen, ob der Ausgleich jetzt doppelt wirkt.
3. Die ganze Testsuite läuft trotzdem immer: gnulib, Ausgabe und gemeinsame Rechenteile ändern sich quer über alle Befehle.
