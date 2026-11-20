/** Minimaler CSV-Leser für den Export der Engine (Anführungszeichen, Komma). */
export function parseCsv(text: string): string[][] { return parseCsvJe(text, r => r); }
/** Wie `parseCsv`, aber jede Zeile wird sofort umgewandelt (`je` gibt `undefined` zurück = Zeile auslassen): die Zeile aus Texten
 *  steht nie neben allen anderen im Speicher - bei 400.000 Zeilen × 47 Spalten sparte das eine ganze Kopie der Tabelle (Abschlusstest A1). */
export function parseCsvJe<T>(text: string, je: (zeile: string[], nr: number) => T | undefined): T[] {
  const rows: T[] = [];
  let row: string[] = [], cur = '', quoted = false, nr = 0;
  const ab = (z: string[]) => { const v = je(z, nr++); if (v !== undefined) rows.push(v); };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else quoted = false; } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n') { row.push(cur); ab(row); row = []; cur = ''; }
    else if (ch !== '\r') cur += ch;
  }
  if (cur || row.length) { row.push(cur); ab(row); }
  return rows;
}
