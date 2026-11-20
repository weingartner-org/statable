/**
 * Bedingungen für PSPP-Befehle der Form `IF (<Bedingung>) spalte = 1.` über Zeilennummern ($CASENUM). Nur Zahlen, nie Text aus Dateien.
 * Aufeinanderfolgende Zeilen werden zu `RANGE($CASENUM, a, b)`; je Bedingung höchstens 20 Teile (kurze Befehlszeilen).
 * `zeilen`: 0-basierte Datenzeilen (Nummer wie in der erkannten Tabelle), beliebige Reihenfolge, doppelte fallen weg.
 */
export function fallBedingungen(zeilen: number[]): string[] {
  const t = [...new Set(zeilen.filter(Number.isInteger))].sort((a, b) => a - b).map(i => i + 1);
  const teile: string[] = [];
  for (let i = 0; i < t.length;) { let j = i; while (t[j + 1] === t[j]! + 1) j++; teile.push(i === j ? `$CASENUM = ${t[i]}` : `RANGE($CASENUM, ${t[i]}, ${t[j]})`); i = j + 1; }
  const aus: string[] = [];
  for (let i = 0; i < teile.length; i += 20) aus.push(teile.slice(i, i + 20).join(' OR '));
  return aus;
}
