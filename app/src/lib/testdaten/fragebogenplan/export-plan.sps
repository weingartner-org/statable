* Statable: Syntax zum Fragebogen Studierendenbefragung (Revision 3, Sprache de).
VARIABLE LABELS einw 'Ich stimme der Teilnahme zu.'.
VARIABLE LABELS alter 'Wie alt sind Sie?'.
VARIABLE LABELS geb 'Wann sind Sie geboren?'.
VARIABLE LABELS studium 'Sind Sie eingeschrieben?'.
VARIABLE LABELS medien_1 'Welche Medien nutzen Sie? - Zeitung'.
VARIABLE LABELS medien_2 'Welche Medien nutzen Sie? - Radio'.
VARIABLE LABELS medien_3 'Welche Medien nutzen Sie? - Internet'.
VARIABLE LABELS medien_4 'Welche Medien nutzen Sie? - Nichts davon'.
VARIABLE LABELS medien_m8 'Welche Medien nutzen Sie? - weiß nicht'.
VARIABLE LABELS medien_anders 'Welche Medien nutzen Sie? - Anderes, und zwar:'.
VARIABLE LABELS tv_nutzung 'Sehen Sie online fern?'.
VARIABLE LABELS stunden 'Wie viele Stunden täglich?'.
VARIABLE LABELS rang_1 'Ordnen Sie nach Wichtigkeit. - Preis'.
VARIABLE LABELS rang_2 'Ordnen Sie nach Wichtigkeit. - Qualität'.
VARIABLE LABELS rang_3 'Ordnen Sie nach Wichtigkeit. - Service'.
VARIABLE LABELS zust_z1 'Wie sehr stimmen Sie zu? - Ich lerne gern.'.
VARIABLE LABELS zust_z2 'Wie sehr stimmen Sie zu? - Ich bin oft müde.'.
VARIABLE LABELS zust_z3 'Wie sehr stimmen Sie zu? - Prüfungen sind fair.'.
VARIABLE LABELS kommentar 'Was möchten Sie noch sagen?'.
VALUE LABELS einw 1 'zugestimmt'.
VALUE LABELS studium -9 'Keine Angabe' 1 'Ja' 2 'Nein'.
VALUE LABELS medien_1 0 'nicht angekreuzt' 1 'Zeitung'.
VALUE LABELS medien_2 0 'nicht angekreuzt' 1 'Radio'.
VALUE LABELS medien_3 0 'nicht angekreuzt' 1 'Internet'.
VALUE LABELS medien_4 0 'nicht angekreuzt' 1 'Nichts davon'.
VALUE LABELS medien_m8 0 'nicht angekreuzt' 1 'weiß nicht'.
VALUE LABELS tv_nutzung -9 'Keine Angabe' 1 'Ja' 2 'Nein'.
VALUE LABELS zust_z1 -8 'weiß nicht' 1 'stimme gar nicht zu' 2 'stimme eher nicht zu' 3 'teils/teils' 4 'stimme eher zu' 5 'stimme voll zu'.
VALUE LABELS zust_z2 -8 'weiß nicht' 1 'stimme gar nicht zu' 2 'stimme eher nicht zu' 3 'teils/teils' 4 'stimme eher zu' 5 'stimme voll zu'.
VALUE LABELS zust_z3 -8 'weiß nicht' 1 'stimme gar nicht zu' 2 'stimme eher nicht zu' 3 'teils/teils' 4 'stimme eher zu' 5 'stimme voll zu'.
MISSING VALUES studium (-9).
MISSING VALUES tv_nutzung (-9).
MISSING VALUES zust_z1 (-8).
MISSING VALUES zust_z2 (-8).
MISSING VALUES zust_z3 (-8).
VARIABLE LEVEL einw (NOMINAL).
VARIABLE LEVEL alter (SCALE).
VARIABLE LEVEL geb (SCALE).
VARIABLE LEVEL studium (NOMINAL).
VARIABLE LEVEL medien_1 (NOMINAL).
VARIABLE LEVEL medien_2 (NOMINAL).
VARIABLE LEVEL medien_3 (NOMINAL).
VARIABLE LEVEL medien_4 (NOMINAL).
VARIABLE LEVEL medien_m8 (NOMINAL).
VARIABLE LEVEL medien_anders (NOMINAL).
VARIABLE LEVEL tv_nutzung (NOMINAL).
VARIABLE LEVEL stunden (SCALE).
VARIABLE LEVEL rang_1 (ORDINAL).
VARIABLE LEVEL rang_2 (ORDINAL).
VARIABLE LEVEL rang_3 (ORDINAL).
VARIABLE LEVEL zust_z1 (ORDINAL).
VARIABLE LEVEL zust_z2 (ORDINAL).
VARIABLE LEVEL zust_z3 (ORDINAL).
VARIABLE LEVEL kommentar (NOMINAL).
FORMATS geb (DATE11).
COMPUTE zust_z2_u = (1 + 5) - zust_z2.
VARIABLE LABELS zust_z2_u 'Wie sehr stimmen Sie zu? - Ich bin oft müde. (umgepolt)'.
VARIABLE LEVEL zust_z2_u (ORDINAL).
COMPUTE lernen = MEAN.2(zust_z1, zust_z2_u, zust_z3).
VARIABLE LABELS lernen 'Skala lernen (Mittelwert)'.
VARIABLE LEVEL lernen (SCALE).
EXECUTE.
