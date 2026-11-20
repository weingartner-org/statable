# Beispielinterview "Wie Studierende ihre Zeit im Semester planen"

Erfundenes Beispiel für die Übung. Personen und Aussagen sind ausgedacht.
Fictional example for practice. People and statements are made up.

Lizenz / Licence: CC0 1.0 (Public Domain Dedication), Statable.

## Inhalt

| Datei | Was |
|---|---|
| `semesterplanung-de.m4a` | Aufnahme auf Deutsch, 4:36, M4A (AAC), mono, rund 1,1 MB |
| `semesterplanung-en.m4a` | Aufnahme auf Englisch, 3:47, M4A (AAC), mono, rund 0,9 MB |
| `semesterplanung-xx-atrain.txt` | Transkript in der Form von aTrain mit Zeitmarken (`SPEAKER_00` = interviewende Person, `SPEAKER_01` = befragte Person) |
| `semesterplanung-xx-f4.txt` | Transkript im f4-Stil (`I:` und `B:`, Zeitmarke `#hh:mm:ss-d#` am Ende jedes Beitrags) |
| `semesterplanung-xx-teams.vtt` | Transkript im Stil eines Teams-Exports (WebVTT, `<v Name>`) |

Die drei Fassungen eines Gesprächs enthalten dieselben 17 Beiträge mit denselben Zeiten. Sie sind von Hand bereinigt, so wie man ein Transkript nach dem Korrigieren hätte: Pausen `(...)`, Lachen `(lacht)`, unverständliche Stellen `(unv.)`, ein abgebrochenes Wort (`glei-`), Füllwörter (`ähm`) und ein `Mhm.` der interviewenden Person zwischen zwei Beiträgen der befragten Person. Das ist Absicht: Der Transkript-Prüfer in Statable hat so etwas zu zeigen. Ein Programm wie aTrain würde diese Klammern nicht selbst schreiben.

## Wie erzeugt

Die Aufnahmen sind synthetische Sprache (Windows-Sprachausgabe, Stimmen "Microsoft Hedda Desktop" und "Microsoft Zira Desktop"). Beide Personen sprechen mit derselben Stimme, die interviewende Person etwas tiefer und schneller. Jeder Beitrag wurde einzeln gesprochen und mit kurzen Pausen zusammengesetzt; daher sind Beginn und Ende jedes Beitrags genau gemessen. Pausen, Lachen und unverständliche Stellen sind Stille, das Lachen wird nicht gesprochen.

Neu erzeugen (Windows, nichts muss installiert werden): `powershell -ExecutionPolicy Bypass -File scripts\beispiel-interview\alles.ps1` im Ordner `pspp-web`. Die Beiträge stehen in `scripts/beispiel-interview/beitraege-de.json` und `beitraege-en.json`, die gemessenen Zeiten in `zeiten-de.json` und `zeiten-en.json`.
