/** Dateinamen aller Exporte (Abnahme 4, B7): „<Titel> - <Art>.<Endung>“, Leerzeichen erlaubt, ohne Zeichen, die Dateisysteme nicht mögen.
 *  Art: Ergebnisse (ein Blatt), Tabelle, Abbildung. Der Bericht heißt „Bericht <Projekt>“. */
export const dateiname = (n: string) => (n || 'Statable').replace(/[\\/:*?"<>|$]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
