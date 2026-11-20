/**
 * Die Wahl unter dem ICC mit zwei Zahlenspalten: „Methodenvergleich“ (Passing-Bablok, Deming; Später S-F, M6). Gehört zum Blatt (`blatt.mv`, kommt mit der Projektdatei);
 * fehlt das Feld (alte Projekte), ist die Option aus. λ steht als Text, damit die Eingabe so bleibt, wie sie getippt wurde („1,5“).
 */
export interface MvWahl { an: boolean; lambda: string; tausch: boolean }
export const leereMvWahl = (): MvWahl => ({ an: false, lambda: '1', tausch: false });
